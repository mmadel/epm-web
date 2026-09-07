import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CONSOLE_AUTH } from 'core';
import { Placeholder } from 'ui';

/**
 * What the console shows when it is not showing the console.
 *
 * FIVE OF THE SIX AUTH STATES RENDER THROUGH HERE and the sixth is the shell, so
 * this is every screen a platform administrator can be looking at before they are
 * signed in. It exists as one component rather than five because the difference
 * between them is words - the arrangement, the heading level, the fact that there
 * is a page at all rather than an empty document, are the same problem five times.
 *
 * IT IS `ui`'s PLACEHOLDER AND NOT A NEW LAYOUT. That component is already "a
 * screen that has a name but nothing on it yet", which is exactly what a splash
 * during a redirect is, and it already renders the `h1` a screen reader needs to
 * find. A second thing shaped like it would be a second thing to keep in line
 * with the type scale.
 *
 * THERE IS NO FRAME AROUND IT, and that is the point of putting it here rather
 * than inside `ConsoleLayout`. The frame shows who is signed in and which
 * environment they are pointed at; on four of these five screens nobody is signed
 * in, so the frame would be drawing an empty account mark next to a heading
 * explaining that there is no account. `app.html` chooses between this and the
 * frame, and never nests them.
 */
@Component({
  selector: 'app-auth-state-page',
  imports: [Placeholder],
  templateUrl: './auth-state-page.html',
  styleUrl: './auth-state-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthStatePage {
  private readonly auth = inject(CONSOLE_AUTH);

  protected readonly status = this.auth.status;

  /**
   * The provider, named, for the state where it could not be reached.
   *
   * NAMED RATHER THAN DESCRIBED, and criterion 11 is specifically about this. "We
   * could not sign you in" is a sentence somebody forwards to a colleague who
   * then asks which provider and on what port; the issuer answers both, and it is
   * the string that is actually wrong when the issuer is what is wrong
   * (`LLD-INFRASTRUCTURE.md` §I5).
   */
  protected readonly issuer = this.auth.issuer;

  /**
   * Tries the whole start-up again, by reloading.
   *
   * A RELOAD AND NOT A RETRY CALL, which looks blunt and is the honest option.
   * Everything that failed happened during start-up - discovery, the code
   * exchange, the session restore - and re-running it in place would mean a
   * second entry point into a state machine whose whole design is that there is
   * one. The page is offered only where retrying can help: not on the
   * not-permitted page, where the answer will not change.
   */
  protected retry(): void {
    window.location.reload();
  }

  /**
   * Ends the session at the provider, from the not-permitted page.
   *
   * IT IS THE ONLY CONTROL ON THAT PAGE THAT CHANGES ANYTHING, and it is there
   * because somebody who signed in with the wrong account has no other way back
   * to the login screen: Keycloak's session is open, so reloading signs them
   * straight back in as the same refused person. A "try again" button would do
   * exactly that and look like a fault in the console.
   */
  protected signOut(): void {
    this.auth.signOut();
  }
}

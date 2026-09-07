import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CONSOLE_AUTH } from 'core';
import { Placeholder, TranslatePipe } from 'ui';

/**
 * What the console shows when it is not showing the console.
 *
 * THE PLATFORM CONSOLE HAS ONE OF THESE TOO AND THEY ARE NOT SHARED, which is
 * worth stating because they look like the same component. They are not: this one
 * resolves every string through the translations, because this console is
 * bilingual with the language switched at runtime, and the platform one writes
 * its strings in the template because that console is English-only and LTR-only
 * and nothing in it may construct `LanguageService` (P-03.2). A single component
 * in `ui` would have to do one or the other, and either choice breaks one console.
 *
 * What IS shared is `ui`'s `Placeholder`, which is the arrangement and the `h1`,
 * and the `auth.*` keys, which are the wording. The duplication is the wiring
 * between them.
 *
 * THERE IS NO FRAME AROUND IT. The frame carries the wordmark and the language
 * switch; on four of these five states nobody is signed in, so a frame would be
 * drawing the signed-in console's chrome around a page explaining that there is
 * no session. `app.html` chooses between this and the frame, and never nests them.
 */
@Component({
  selector: 'app-auth-state-page',
  imports: [Placeholder, TranslatePipe],
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
   * NOT TRANSLATED, AND IT MUST NOT BE. It is a URL that somebody is going to
   * compare character for character against a `.well-known` document
   * (`LLD-INFRASTRUCTURE.md` §I5); a localised rendering of it would be a
   * different string from the one that is actually configured.
   */
  protected readonly issuer = this.auth.issuer;

  /**
   * Tries the whole start-up again, by reloading.
   *
   * A reload and not a retry call: everything that failed happened during
   * start-up, and re-running it in place would be a second entry point into a
   * state machine whose whole design is that there is one.
   */
  protected retry(): void {
    window.location.reload();
  }

  /**
   * Ends the session at the provider, from the not-permitted page.
   *
   * The only control on that page that changes anything. Reloading would sign the
   * same refused person straight back in, because Keycloak's own session is still
   * open - which is why there is no "try again" there.
   */
  protected signOut(): void {
    this.auth.signOut();
  }
}

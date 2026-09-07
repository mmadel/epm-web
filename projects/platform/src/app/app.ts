import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CONSOLE_AUTH } from 'core';

import { AuthStatePage } from './layout/auth-state-page';
import { ConsoleLayout } from './layout/console-layout';

/**
 * The application root.
 *
 * IT DECIDES BETWEEN THE CONSOLE AND THE PAGES THAT COME BEFORE IT, and that is
 * the only decision it makes. Everything the frame knows - the environment, who
 * is signed in, where home is - is the layout's business, and everything on a
 * screen is the routed component's.
 *
 * THE SHELL IS NOT RENDERED AND THEN HIDDEN. T-111 §4: "never a flash of the
 * signed-in shell". A frame that mounted first and was covered over would still
 * paint, would still put the previous session's name in the header for a frame or
 * two, and would still be in the DOM for anything reading it. `@if` and not a
 * class: the console does not exist until somebody is signed in.
 *
 * THAT MAKES THIS THE SECOND OF THE TWO PLACES AUTH IS ENFORCED, and the
 * duplication is deliberate. `platformAdminGuard` stops a route activating; this
 * stops the frame rendering. They are different things to get wrong - a guard
 * cannot prevent a frame with no route in it, and a frame cannot prevent a screen
 * reached before the guard's answer arrives.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConsoleLayout, AuthStatePage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly status = inject(CONSOLE_AUTH).status;

  /**
   * Whether the console itself may be on the screen.
   *
   * ONE STATE OUT OF SIX SAYS YES, which is why this is written as an equality
   * rather than as a list of the states that say no. A seventh state added to the
   * union renders the auth pages, which is the safe half of the answer; written
   * the other way round it would render the console, which is not.
   */
  protected readonly isSignedIn = computed(() => this.status() === 'signedIn');
}

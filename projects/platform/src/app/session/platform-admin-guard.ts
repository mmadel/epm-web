import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { isPlatformAdmin, isSignedIn, SESSION_SOURCE } from 'core';

/**
 * Every route in this console requires a signed-in platform administrator.
 *
 * TWO QUESTIONS, AND THEY ARE NOT THE SAME QUESTION. `isSignedIn` asks whether
 * anybody is signed in at all, which is the identity provider's business and is
 * `core`'s to answer for both consoles. This asks whether the person who
 * signed in is the kind of actor this console serves, which is only ever this
 * console's business - staff needs a guard for a different kind of actor, not
 * this one.
 *
 * It asks the session seam rather than resolving the caller itself, and the seam
 * now has an identity provider behind it instead of a mock (T-111). Nothing about
 * this guard moved when that happened, which is what the seam was for.
 *
 * **A denied caller gets `false` and no redirect**, and the reason has changed
 * even though the behaviour has not. It used to be that there was nowhere to send
 * them; now there is, and sending them is somebody else's job - `ConsoleAuth`
 * decides to go to the provider once, when the console starts, from the address
 * the browser was opened with. A guard that also redirected would race it and
 * would lose the deep link it is carrying (T-111 criterion 8).
 *
 * WHAT A REFUSED NAVIGATION LOOKS LIKE is not decided here either. The root
 * renders on the auth status: a splash while a session is restored, nothing at
 * all while the redirect is in flight, the not-permitted page after a 403. All
 * this guarantees is that no screen activates in any of them.
 */
export const platformAdminGuard: CanActivateFn = () => {
  if (!isSignedIn()) {
    return false;
  }

  const session = inject(SESSION_SOURCE).session();

  // `undefined` is not "let them through". A signed-in person whose session has
  // not resolved is not a platform administrator, and treating an unanswered
  // question as a yes is the shape of every authorization bug worth having.
  return session !== undefined && isPlatformAdmin(session);
};

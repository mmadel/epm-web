import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { isPlatformAdmin, SESSION_SOURCE } from 'core';

/**
 * Every route in this console requires a platform administrator.
 *
 * With the mock in place this always passes, and that is the expected state: the
 * point of the ticket that added it is that the seam exists before auth arrives,
 * not that it protects anything yet. When an identity provider replaces the
 * mock, this guard starts doing real work without moving and without any route
 * changing.
 *
 * It asks the session seam rather than resolving the caller itself. That is the
 * whole arrangement - one place answers "who is signed in", so there is no
 * second, staler answer for a screen to act on.
 *
 * **A denied caller gets `false` and no redirect.** There is deliberately
 * nowhere to send them: whether this console has its own identity realm, and
 * whether sign-in is a bearer token or a cookie session, are both open
 * architecture decisions. Redirecting to a `/login` route would mean inventing
 * the login screen this milestone says not to build, and it would be thrown away
 * when those decisions land.
 *
 * It lives in the platform application rather than in `core` because it is not
 * reusable: staff needs a guard for a different kind of actor, not this one.
 */
export const platformAdminGuard: CanActivateFn = () =>
  isPlatformAdmin(inject(SESSION_SOURCE).session());

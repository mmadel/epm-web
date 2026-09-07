import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { CONSOLE_AUTH } from './console-auth';

/**
 * Whether somebody is signed in, asked from an injection context.
 *
 * The predicate rather than the guard, so that a console needing a second
 * question - the platform one asks what KIND of actor signed in - can compose the
 * two without going through the router's guard signature and its
 * `MaybeAsync<GuardResult>` return type. There is one place the string
 * `'signedIn'` is compared, and this is it.
 */
export function isSignedIn(): boolean {
  return inject(CONSOLE_AUTH).status() === 'signedIn';
}

/**
 * A route may only be activated by somebody who is signed in.
 *
 * IT REFUSES AND DOES NOT REDIRECT, and that is not the same omission it used to
 * be. Sending for the provider is {@link ConsoleAuth}'s job and it does it once,
 * when the console starts, from the address the browser actually opened - which
 * is what carries a deep link through the round trip (T-111 criterion 8). A guard
 * that also called `authorize()` would be a second thing racing to leave the
 * page, and it would run again on every navigation the first had not finished.
 *
 * WHAT THE PERSON SEES WHILE THIS IS FALSE IS NOT THIS GUARD'S BUSINESS EITHER.
 * The root renders on {@link ConsoleAuth.status}: a splash while a session is
 * being restored, the login redirect when there is none, the not-permitted page
 * on a 403. All this has to guarantee is that no route activates in any of them -
 * "an unauthenticated visit never renders a shell" is enforced in two places
 * because the shell and the screen inside it are two different things to get
 * wrong.
 */
export const authenticatedGuard: CanActivateFn = () => isSignedIn();

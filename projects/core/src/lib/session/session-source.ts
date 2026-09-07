import { InjectionToken, Signal } from '@angular/core';

import { Session } from './session';

/**
 * The seam between an application and whatever knows who is signed in.
 *
 * The caller resolver sits behind an interface, a mock implements it today, an
 * identity provider implements it later, and swapping them is configuration.
 * This is that interface, and it is deliberately tiny: one signal, read-only.
 * Everything a feature could want to know about the caller is derived from it,
 * so there is one answer to "who is signed in" rather than one per screen.
 *
 * A signal rather than an observable or a plain getter, for the same reason the
 * active language is one: every consumer wants the value synchronously and wants
 * to re-render when it changes.
 *
 * There is no `signIn`/`signOut` on here on purpose. Both are auth, auth is
 * blocked on decisions nobody has made, and an interface that names them now
 * would be guessing at their shape.
 */
export interface SessionSource {
  /**
   * Who is signed in, or `undefined` while nobody is.
   *
   * NULLABLE BECAUSE THE REAL IMPLEMENTATION GENUINELY HAS NOTHING TO SAY YET.
   * While a mock answered this, "there is always a session" was true and cost
   * nothing; with an identity provider behind it (T-111) there is a real stretch
   * of time - the session being restored, the redirect to the provider, the code
   * coming back - during which the honest answer is that nobody is signed in.
   *
   * A caller that gets `undefined` must not treat it as a session with holes in
   * it. It is the whole of the answer: ask again once {@link ConsoleAuth.status}
   * says `signedIn`, which is the only state a console renders a screen in.
   */
  readonly session: Signal<Session | undefined>;
}

/**
 * The active {@link SessionSource}.
 *
 * Declared without a `providedIn` factory default, like `API_BASE_URL` and for a
 * stronger version of the same reason: there is no safe default for "who is
 * signed in". A default would let an application that forgot to configure a
 * session boot anyway, with the fallback silently deciding what the caller is
 * allowed to see. A missing provider must fail loudly at injection instead.
 */
export const SESSION_SOURCE = new InjectionToken<SessionSource>('SESSION_SOURCE');

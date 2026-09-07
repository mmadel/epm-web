import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * What a console is doing about the person in front of it.
 *
 * SIX STATES, AND EVERY ONE OF THEM RENDERS SOMETHING (T-111 §4). A console with
 * fewer states does not have fewer situations - it has situations it draws as a
 * blank page, and the two that get drawn that way are the two worth naming: a
 * provider that is not answering, and a token that is valid for somebody the API
 * has never heard of.
 */
export type AuthStatus =
  /**
   * Nothing is decided yet: a stored session is being restored.
   *
   * The console shows a neutral splash. It must NOT show the shell - a frame that
   * appears and is then replaced by a redirect is a flash of the signed-in
   * application to somebody who is not signed in.
   */
  | 'starting'

  /** No session. The provider has been sent for and the page is on its way out. */
  | 'redirecting'

  /** Back from the provider with a code, which is being exchanged for a token. */
  | 'signingIn'

  /** A token was acquired. The shell renders. */
  | 'signedIn'

  /**
   * The token is valid and its owner is nobody this console serves: the API
   * answered 403 (`LLD-IDENTITY.md` §4).
   *
   * IT IS A DEAD END ON PURPOSE. Signing in again produces the same valid token
   * and the same 403, so a console that retries here spins forever - which is the
   * failure T-111 exists to catch. See {@link ConsoleAuth.refuse}.
   */
  | 'notPermitted'

  /**
   * The identity provider could not be reached at all - its discovery document
   * did not load, or the token endpoint refused the connection.
   *
   * Distinct from every other state because nothing the person does will help,
   * and because the page has to be able to NAME the provider: "sign-in is broken"
   * and "Keycloak is not running on :8180" are the same screen to a user and
   * different days of work to whoever gets called.
   */
  | 'providerUnreachable';

/**
 * The signed-in person, as the identity provider described them.
 *
 * FOR DISPLAY, AND FOR NOTHING ELSE. `LLD-INFRASTRUCTURE.md` §I9: claims are not
 * read to make decisions. There is no role here, no `org_id`, no practice, and
 * none of them is coming - what the caller may do is the API's answer, taken from
 * its principal, and a console that read it out of the token would be deciding
 * with a copy the server never agreed to.
 *
 * `userId` is the token's `sub` and is a label, not a permission: it identifies
 * the row the API resolves, it does not authorise anything.
 */
export interface AuthUser {
  /** The token's `sub`. Stable, and not a permission. */
  readonly userId: string;

  /** Their name, for a header. Never used to make a decision. */
  readonly displayName: string;
}

/**
 * The seam between an application and whatever signs people in.
 *
 * It is the auth half of what `SessionSource` deliberately left out - that
 * interface says "there is no `signIn`/`signOut` on here on purpose, because auth
 * is blocked on decisions nobody has made". T-111 is where those decisions were
 * made, so this is where they are written down; `SessionSource` still answers
 * only "who is signed in", and this answers "what is the console doing about it".
 *
 * IT IS AN INTERFACE AND A TOKEN, NOT A CLASS, for the same reason the rest of
 * `core`'s seams are. The OIDC implementation drags a whole library and a network
 * round trip behind it, and the two things that must be tested without either -
 * the interceptor and the guard - depend on this and not on that.
 */
export interface ConsoleAuth {
  /** What the console is doing about signing in. Drives what the root renders. */
  readonly status: Signal<AuthStatus>;

  /** The signed-in person, or `undefined` before there is one. Display only. */
  readonly user: Signal<AuthUser | undefined>;

  /**
   * The issuer this console signs in against, exactly as configured.
   *
   * Here so that the provider-unreachable page can name it. A page that says
   * "could not reach the sign-in provider" without saying which one is a page
   * that gets forwarded to somebody who then asks which one.
   */
  readonly issuer: string;

  /**
   * The access token to put on an API request, or the empty string when there is
   * none to put on one.
   *
   * AN OBSERVABLE AND NOT A SIGNAL, which is the one place this interface bends
   * to its implementation. The token is read from storage and is replaced by
   * silent renew without the console being told; a signal mirroring it would be a
   * second copy free to be one renew out of date, and a stale bearer token is a
   * 401 that signs a working user out.
   */
  accessToken(): Observable<string>;

  /**
   * Ends the session at the provider and returns to the post-logout URI.
   *
   * The deliberate one - the control in the header. It is not enough to forget
   * the token locally: the provider's own session would still be open, and
   * reopening the console would sign the person straight back in without asking
   * for anything (T-111 criterion 7).
   */
  signOut(): void;

  /**
   * The session is over and was not ended on purpose: the API answered 401, or a
   * silent renew failed.
   *
   * Local tokens are dropped and the console goes back to the login redirect.
   * ONCE. A 401 that survives a fresh sign-in is a configuration fault - a token
   * this provider issued and this API will not take - and redirecting again would
   * turn it into a loop between two servers that both think they are right.
   */
  sessionEnded(): void;

  /**
   * The API recognised the token and refused its owner: 403.
   *
   * NOTHING IS RETRIED. Not the request, not the login. The token is valid, so
   * signing in again produces exactly the same one, and a console that redirects
   * here bounces between itself and the provider for as long as the tab is open
   * (T-111 criterion 10).
   */
  refuse(): void;
}

/**
 * The active {@link ConsoleAuth}.
 *
 * Declared without a `providedIn` factory default, like `SESSION_SOURCE` and for
 * the same reason: there is no safe default for "is this person signed in". A
 * default would let a console that forgot to configure auth boot anyway, with the
 * fallback deciding whether to render the shell.
 */
export const CONSOLE_AUTH = new InjectionToken<ConsoleAuth>('CONSOLE_AUTH');

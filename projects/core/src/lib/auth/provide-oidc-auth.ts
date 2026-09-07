import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { inject } from '@angular/core';
import {
  AbstractSecurityStorage,
  DefaultSessionStorageService,
  LogLevel,
  provideAuth,
} from 'angular-auth-oidc-client';

import { CONSOLE_AUTH } from './console-auth';
import { OidcConsoleAuth, OidcConsoleAuthConfig } from './oidc-console-auth';

/**
 * Signs this console in against an OpenID Connect provider.
 *
 * ONE CALL PER APPLICATION, IN `app.config.ts`, and it is the only place either
 * console says anything about identity. Which provider and which client are the
 * two things that differ between them (T-111 §5); everything else - the flow, the
 * scopes, where the token is kept, when it is renewed - is the same decision for
 * both and is made here rather than twice.
 *
 * It replaces `providePlatformAdminSession`, which is what the seam in
 * `session-source.ts` was built for: "a mock implements it today, an identity
 * provider implements it later, and swapping them is configuration".
 *
 * @param config the issuer and client id for this console
 */
export function provideOidcAuth(config: OidcConsoleAuthConfig): EnvironmentProviders {
  // The console's own origin, which is both where the provider sends the browser
  // back to and where it lands after a sign-out. It is READ RATHER THAN
  // CONFIGURED so that no development address is written into the bundle: the
  // value is `http://localhost:4400` under `ng serve` because that is where the
  // console is being served from, and it is the deployed origin when it is
  // deployed, without anything in the repository having to say either.
  const origin = globalThis.location?.origin ?? '';

  return makeEnvironmentProviders([
    provideAuth({
      config: {
        // EXACTLY AS `.well-known` SPELLS IT (`LLD-INFRASTRUCTURE.md` §I5). A
        // trailing slash here produces tokens that verify and are refused.
        authority: config.issuer,
        clientId: config.clientId,
        redirectUrl: origin,
        postLogoutRedirectUri: origin,

        // AUTHORIZATION CODE WITH PKCE. `code` is the flow; PKCE and its `S256`
        // challenge are the library's default and are left alone rather than
        // re-stated - `disablePkce` is the only switch, and it is off. The console
        // is a public client and holds no secret: there is nowhere in a browser
        // bundle to put one that a reader of the bundle could not also reach
        // (criterion 6).
        responseType: 'code',

        // `offline_access` is what makes Keycloak issue a refresh token, which is
        // what silent renew uses. `profile` carries the display name. NEITHER IS
        // READ TO DECIDE ANYTHING - see the note on `AuthUser`.
        scope: 'openid profile offline_access',

        // Renewed with a refresh token rather than in a hidden iframe. The iframe
        // route depends on third-party cookies on the provider's origin, which
        // browsers have been switching off for years - a renewal that works on one
        // machine and silently fails on another is worse than one that does not
        // exist.
        silentRenew: true,
        useRefreshToken: true,

        // Ahead of expiry rather than on it, so the renewal happens while the
        // current token is still good and a request caught in the gap does not
        // 401 a working user out.
        renewTimeBeforeTokenExpiresInSeconds: 30,

        // OFF, SO THE LIBRARY TAKES THE USER'S CLAIMS FROM THE id_token instead of
        // calling the provider's userinfo endpoint. That call would be correct and
        // would also put `Authorization: Bearer` on a request to Keycloak, which
        // is exactly what criterion 4 asks somebody to check the network tab for.
        // There is nothing in userinfo this console needs.
        autoUserInfo: false,

        // THE LIBRARY DOES NOT NAVIGATE; THIS APPLICATION DOES. Left on, it sends
        // the browser to `postLoginRoute` the moment the code exchange completes,
        // which is a second navigation racing the one that restores the deep link
        // a person actually asked for (criterion 8). `OidcConsoleAuth.signedIn`
        // owns that decision.
        triggerAuthorizationResultEvent: true,

        // NO `secureRoutes`. The token is attached by `apiTokenInterceptor`, which
        // derives what counts as the API from `API_BASE_URL` - one value, checked
        // once. A list here would be a second answer to the same question, free to
        // disagree with the first after any edit.

        logLevel: LogLevel.Warn,
      },
    }),

    // PINNED, THOUGH IT IS ALSO THE LIBRARY'S DEFAULT. Criterion 13 is that the
    // token is never written to `localStorage`, and a default is a promise
    // somebody else can change in a minor release. Stated here, a change to it is
    // a line in a diff.
    { provide: AbstractSecurityStorage, useClass: DefaultSessionStorageService },

    {
      provide: CONSOLE_AUTH,
      useFactory: () => new OidcConsoleAuth(config),
    },

    // CONSTRUCTED BEFORE THE ROUTER'S FIRST NAVIGATION, and deliberately not
    // awaited. Building it is what starts the session check, and doing that
    // lazily would leave the decision to whichever component injected it first.
    //
    // Awaiting it would be the tidier-looking thing and is the wrong one: a
    // provider that is reachable but slow would hold the console on the browser's
    // own blank page for as long as it took, and "not a blank screen" is
    // criterion 11.
    provideAppInitializer(() => {
      inject(CONSOLE_AUTH);
    }),
  ]);
}

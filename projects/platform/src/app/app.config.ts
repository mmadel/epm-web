import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { BASE_PATH } from 'api-client';
import {
  apiAuthErrorInterceptor,
  API_BASE_URL,
  apiTokenInterceptor,
  provideApiBaseUrl,
  provideOidcAuth,
} from 'core';

import {
  API_BASE_URL_VALUE,
  AUTH_ISSUER_BASE_URL_VALUE,
  ENVIRONMENT_NAME_VALUE,
} from '../environments/environment.generated';
import { routes } from './app.routes';
import { provideEnvironmentName } from './environment/environment-name';
import { PlatformTitleStrategy } from './layout/platform-title-strategy';
import { providePlatformSession } from './session/provide-platform-session';

/**
 * The realm this console signs in against.
 *
 * IT IS THE CONSOLE'S AND NOT THE ENVIRONMENT'S, which is why it is written here
 * rather than read from the build. A platform administrator and a practice's
 * staff are separate populations with separate credentials in separate realms,
 * and that is true in every environment - only the host they live on moves, and
 * that is `AUTH_ISSUER_BASE_URL_VALUE`.
 */
const REALM = 'epm-platform';

/**
 * The issuer, composed once.
 *
 * `LLD-INFRASTRUCTURE.md` §I5: this string is compared to the token's `iss` claim
 * character for character, and a mismatch produces tokens that verify and are
 * refused anyway. Composed in ONE place so there is one string to check against
 * `.well-known` rather than two halves that are each individually plausible.
 */
const ISSUER = `${AUTH_ISSUER_BASE_URL_VALUE}/realms/${REALM}`;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // A navigation that leaves the reader halfway down the previous screen is
      // a navigation they think did not happen.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),

    // -----------------------------------------------------------------------
    // Identity
    // -----------------------------------------------------------------------

    // THE SWAP THE SEAM WAS BUILT FOR. This line was `providePlatformAdminSession()`
    // - a mock that signed in a made-up administrator so that everything behind it
    // could be built before auth existed. `provide-mock-session.ts` said that when
    // an identity provider arrived, an application would swap this one call for
    // that one and nothing downstream would change. T-111 is that moment, and
    // nothing downstream changed: no feature, guard or component knows which
    // implementation answered.
    provideOidcAuth({ issuer: ISSUER, clientId: 'platform-console' }),
    // Who that person is, in this product's vocabulary. It is a separate call
    // because the ACTOR KIND is this console's decision and not a claim - see
    // `provide-platform-session.ts`, and `LLD-INFRASTRUCTURE.md` §I9.
    providePlatformSession(),

    // The build's value, narrowed here and nowhere else. Anything the build did
    // not name becomes `unknown`, which the console renders with production's
    // treatment.
    provideEnvironmentName(ENVIRONMENT_NAME_VALUE),
    // The browser tab carries the environment as well as the page, because a
    // platform administrator with four tabs open is looking at the tab strip.
    { provide: TitleStrategy, useClass: PlatformTitleStrategy },

    // -----------------------------------------------------------------------
    // The API
    // -----------------------------------------------------------------------

    // TWO INTERCEPTORS, AND THE ORDER IS THE ORDER OF THE ROUND TRIP. The token
    // one runs first on the way out, so the request that leaves carries the
    // bearer; the error one wraps it, so it sees the answer that comes back to a
    // request that had one. Reversed, a 401 would be handled for a request that
    // was never given a token to be wrong about.
    //
    // BOTH ARE SCOPED TO THE API BY THE SAME FUNCTION, `isApiRequest`. Neither
    // touches a request to the identity provider or to anywhere else: the token
    // is not attached to it, and its 403 is not this console's 403.
    provideHttpClient(withInterceptors([apiTokenInterceptor, apiAuthErrorInterceptor])),
    // Validated here: an empty, relative or non-http value throws at bootstrap
    // rather than producing a console that sends every request to a URL nobody
    // will look at until it 404s. The one relative value it accepts is `/`, which
    // resolves to the empty string - same origin, which under `ng serve` is
    // proxy.conf.json forwarding /api to the local backend (T-92).
    provideApiBaseUrl(API_BASE_URL_VALUE),
    // THE GENERATED CLIENT'S TOKEN, DERIVED FROM THE VALIDATED ONE rather than
    // given the raw build value a second time. `provideApi(API_BASE_URL_VALUE)`
    // would work and would be one line shorter, and it would also be a second
    // place the base URL is decided - free to disagree with the first after any
    // edit. This way there is one value, checked once.
    //
    // It matters more than it looks: the generated `BaseService` falls back to
    // `http://localhost` when `BASE_PATH` is absent, so a console with this
    // provider missing does not fail - it quietly talks to whatever is on port
    // 80 of the machine the browser is on.
    { provide: BASE_PATH, useFactory: () => inject(API_BASE_URL) },
    // NO `provideLanguage()`, DELIBERATELY. This console is English-only and LTR-only
    // (P-03.2) and nothing in it may construct LanguageService - constructing it
    // labels the document with `lang` and `dir`, and `console-layout.spec.ts` fails
    // the build for it. That is also why the onboarding screen words its own server
    // failures instead of reusing `ui`'s ErrorMessage, which resolves its wording
    // through the translations. See `features/organizations/data/error-messages.ts`.
  ],
};

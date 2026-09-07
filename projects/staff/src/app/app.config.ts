import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BASE_PATH } from 'api-client';
import {
  apiAuthErrorInterceptor,
  API_BASE_URL,
  apiTokenInterceptor,
  provideApiBaseUrl,
  provideLanguage,
  provideOidcAuth,
} from 'core';

import {
  API_BASE_URL_VALUE,
  AUTH_ISSUER_BASE_URL_VALUE,
} from '../environments/environment.generated';
import { routes } from './app.routes';

/**
 * The realm this console signs in against.
 *
 * A DIFFERENT REALM FROM THE PLATFORM CONSOLE'S, AND THAT IS THE POINT OF HAVING
 * TWO. A platform administrator sits outside every practice and a staff member
 * works inside exactly one; they are separate populations with separate
 * credentials, and a shared realm would make "which console may this account
 * open" a question about roles rather than a question that cannot be asked.
 *
 * It is written here rather than read from the build because it is a fact about
 * this console in every environment. Only the host moves, and that is
 * `AUTH_ISSUER_BASE_URL_VALUE`.
 */
const REALM = 'epm-staff';

/**
 * The issuer, composed once.
 *
 * `LLD-INFRASTRUCTURE.md` §I5: compared to the token's `iss` claim character for
 * character, so there is one string to check against `.well-known` rather than
 * two halves that are each individually plausible.
 */
const ISSUER = `${AUTH_ISSUER_BASE_URL_VALUE}/realms/${REALM}`;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // -----------------------------------------------------------------------
    // Identity
    // -----------------------------------------------------------------------

    // THIS CONSOLE SIGNS IN AND STOPS THERE, and that is the expected end of it
    // for now. No staff account exists - there is no way to create one yet
    // (T-111 §6) - so what this reaches is Keycloak's `epm-staff` login page,
    // which is exactly what criterion 12 asks for.
    //
    // THERE IS NO `SESSION_SOURCE` HERE, and its absence is a decision rather than
    // a gap. A staff session is an `OrganizationMemberSession` and needs an
    // organization id; the only place a console could get one without asking the
    // API is the token, which is what `LLD-INFRASTRUCTURE.md` §I9 forbids. The
    // seam stays unfilled until a route answers it.
    provideOidcAuth({ issuer: ISSUER, clientId: 'staff-console' }),

    // -----------------------------------------------------------------------
    // The API
    // -----------------------------------------------------------------------

    // TWO INTERCEPTORS, AND THE ORDER IS THE ORDER OF THE ROUND TRIP. The token
    // one runs first on the way out so the request that leaves carries the bearer;
    // the error one wraps it, so it sees the answer that came back to a request
    // that had one. Both are scoped to the API by `isApiRequest`, so neither
    // touches a request to the identity provider.
    //
    // WIRED THOUGH NOTHING HERE CALLS THE API YET, for the same reason `BASE_PATH`
    // is: the first screen to make a request must not be the first screen to
    // discover that its token was never attached.
    provideHttpClient(withInterceptors([apiTokenInterceptor, apiAuthErrorInterceptor])),
    // Validated here: an empty or non-http value throws at bootstrap rather than
    // producing a console that sends every request to a URL nobody will look at
    // until it 404s. `/` is the one relative value it accepts, and it resolves to
    // the empty string - same origin, which under `ng serve` is proxy.conf.json
    // forwarding /api to the local backend (T-92).
    provideApiBaseUrl(API_BASE_URL_VALUE),
    // THE GENERATED CLIENT'S TOKEN, DERIVED FROM THE VALIDATED ONE rather than
    // given the raw build value a second time, so there is one value checked once.
    //
    // It is provided even though nothing here calls the API yet, because the
    // generated `BaseService` falls back to `http://localhost` when `BASE_PATH` is
    // absent: the first screen to make a request would not fail, it would quietly
    // talk to whatever is on port 80 of the machine the browser is on.
    { provide: BASE_PATH, useFactory: () => inject(API_BASE_URL) },
    // Labels the document with `lang`/`dir` at bootstrap rather than waiting for
    // the first component that happens to inject the language service.
    provideLanguage(),
  ],
};

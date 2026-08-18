import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BASE_PATH } from 'api-client';
import { API_BASE_URL, provideApiBaseUrl, provideLanguage } from 'core';

import { API_BASE_URL_VALUE } from '../environments/environment.generated';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // -----------------------------------------------------------------------
    // The API
    // -----------------------------------------------------------------------

    provideHttpClient(),
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

import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { BASE_PATH } from 'api-client';
import { API_BASE_URL, provideApiBaseUrl, providePlatformAdminSession } from 'core';

import { API_BASE_URL_VALUE, ENVIRONMENT_NAME_VALUE } from '../environments/environment.generated';
import { routes } from './app.routes';
import { provideEnvironmentName } from './environment/environment-name';
import { PlatformTitleStrategy } from './layout/platform-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // A navigation that leaves the reader halfway down the previous screen is
      // a navigation they think did not happen.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // The caller resolver is configuration, and this line is that configuration.
    // Replacing the mock with an identity provider is a change to this one call
    // and to nothing else in the application - which is the only reason putting
    // a seam in front of it was worth doing.
    providePlatformAdminSession(),
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

    provideHttpClient(),
    // Validated here: an empty, relative or non-http value throws at bootstrap
    // rather than producing a console that sends every request to a URL nobody
    // will look at until it 404s.
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

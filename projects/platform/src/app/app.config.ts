import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { providePlatformAdminSession } from 'core';

import { ENVIRONMENT_NAME_VALUE } from '../environments/environment.generated';
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
  ],
};

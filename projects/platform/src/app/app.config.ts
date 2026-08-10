import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePlatformAdminSession } from 'core';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // The caller resolver is configuration, and this line is that configuration.
    // Replacing the mock with an identity provider is a change to this one call
    // and to nothing else in the application - which is the only reason putting
    // a seam in front of it was worth doing.
    providePlatformAdminSession(),
  ],
};

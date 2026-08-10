import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideApiBaseUrl } from 'core';

import { API_BASE_URL_VALUE } from '../environments/environment.generated';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideApiBaseUrl(API_BASE_URL_VALUE),
  ],
};

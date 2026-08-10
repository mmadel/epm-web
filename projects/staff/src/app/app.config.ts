import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideApiBaseUrl, provideLanguage } from 'core';

import { API_BASE_URL_VALUE } from '../environments/environment.generated';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideApiBaseUrl(API_BASE_URL_VALUE),
    // Labels the document with `lang`/`dir` at bootstrap rather than waiting for
    // the first component that happens to inject the language service.
    provideLanguage(),
  ],
};

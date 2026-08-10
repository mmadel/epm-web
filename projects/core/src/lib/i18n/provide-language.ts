import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import { LanguageService } from './language-service';

/**
 * Starts the language mechanism at bootstrap.
 *
 * `LanguageService` is `providedIn: 'root'`, so it is only created when something
 * injects it - and until it is created, the document carries no `lang`/`dir` and a
 * previously chosen language has not been restored. That would make the very first
 * paint of the application English and left-to-right for an Arabic user, until some
 * unrelated component happened to inject the service.
 *
 * Applications add this to their providers to make the service eager. It is the only
 * wiring an application needs; everything else derives from the service.
 */
export function provideLanguage(): EnvironmentProviders {
  return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(LanguageService))]);
}

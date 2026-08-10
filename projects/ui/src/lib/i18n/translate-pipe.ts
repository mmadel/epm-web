import { inject, Pipe, PipeTransform } from '@angular/core';

import { TranslationParams, TranslationService } from './translation-service';

/**
 * Resolves a translation key in a template: `{{ 'shell.header.title' | translate }}`,
 * with parameters as `{{ 'errors.upload.too-many' | translate: { limit: 5 } }}`.
 *
 * `pure: false` is the whole point of this pipe, not an oversight. A pure pipe is
 * memoised on its arguments, and the argument here - the key - does not change when
 * the language does, so a pure pipe would keep rendering English after a switch to
 * Arabic until something unrelated forced it to re-evaluate. An impure pipe is
 * re-evaluated during change detection, and because the language is read from a
 * signal inside `TranslationService`, that read is tracked by the view: changing the
 * language marks the view dirty and the new string renders, with no reload.
 *
 * The cost of impurity is that `transform` runs often, so it stays cheap: one object
 * property lookup, plus a regular expression only when parameters are passed.
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(key: string, params?: TranslationParams): string {
    return this.translations.translate(key, params);
  }
}

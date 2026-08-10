import { computed, inject, Injectable, InjectionToken } from '@angular/core';
import { Language, LanguageService } from 'core';

import { TRANSLATIONS } from './translations';

/** Named values substituted into a string, e.g. `{limit}` from `{ limit: 5 }`. */
export type TranslationParams = Readonly<Record<string, string | number>>;

/** A set of strings for one language, keyed by translation key. */
export type TranslationDictionary = Readonly<Record<string, string>>;

/**
 * The strings {@link TranslationService} looks up, one dictionary per language.
 *
 * This exists as a token, rather than the service importing the files directly, for
 * one reason: the Arabic files currently hold English placeholders (see
 * translations/README.md), so with the real strings there is no pair of values that
 * differs between languages, and a test could not honestly demonstrate that changing
 * the language changes rendered text. Tests provide a dictionary whose two languages
 * differ. Applications never provide it - the default is the real translations.
 */
export const TRANSLATIONS_SOURCE = new InjectionToken<
  Readonly<Record<Language, TranslationDictionary>>
>('TRANSLATIONS_SOURCE', { providedIn: 'root', factory: () => TRANSLATIONS });

/** Matches `{name}` placeholders. Deliberately the simplest thing that works. */
const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Resolves a translation key in the active language.
 *
 * Lookup reads the language signal through a `computed`, so a caller in a template
 * or in another `computed` re-runs when the language changes - no reload, no
 * subscription, nothing to unsubscribe from.
 *
 * Keys are typed as plain `string` rather than the `TranslationKey` union exported
 * from ./translations: keys arrive from places the compiler cannot check (an error
 * code from the API, in F-04), and the missing-key behaviour below has to exist for
 * those cases regardless. Callers that can name their keys statically can still
 * annotate them with `TranslationKey` and get the compile-time check.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly languageService = inject(LanguageService);
  private readonly source = inject(TRANSLATIONS_SOURCE);

  /** The strings for the active language. Recomputed when the language changes. */
  private readonly dictionary = computed<TranslationDictionary>(
    () => this.source[this.languageService.language()],
  );

  // A missing key is reported once per key per language. This is looked up from an
  // impure pipe, which runs on every change detection pass; without this the first
  // missing key would bury the console and the next one would never be noticed.
  private readonly reported = new Set<string>();

  /**
   * Returns the string for `key` in the active language.
   *
   * An unknown key returns the key itself and logs a warning. It never returns an
   * empty string: a blank label is invisible in review, survives QA, and ships. The
   * key is ugly on screen on purpose - it is a visible bug that names its own cause.
   *
   * A `{name}` placeholder with no matching parameter is left in place, for the same
   * reason: showing `{limit}` is a bug you can see and report.
   */
  translate(key: string, params?: TranslationParams): string {
    const template: string | undefined = this.dictionary()[key];

    if (template === undefined) {
      this.reportMissing(key);
      return key;
    }

    return params ? interpolate(template, params) : template;
  }

  private reportMissing(key: string): void {
    const language = this.languageService.language();
    const seen = `${language}:${key}`;

    if (this.reported.has(seen)) {
      return;
    }

    this.reported.add(seen);
    console.warn(`[i18n] Missing translation for "${key}" in "${language}". Rendering the key.`);
  }
}

function interpolate(template: string, params: TranslationParams): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = params[name];

    return value === undefined ? placeholder : String(value);
  });
}

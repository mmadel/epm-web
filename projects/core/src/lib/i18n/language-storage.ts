import { InjectionToken } from '@angular/core';

import { DEFAULT_LANGUAGE, isLanguage, Language } from './language';

/** Where the chosen language is kept. Namespaced so it cannot collide. */
export const LANGUAGE_STORAGE_KEY = 'epm.language';

/**
 * The `Storage` the language preference is kept in, or `null` when there is none.
 *
 * `localStorage` is not something that can be assumed to exist, and this is not a
 * theoretical worry: Safari's private mode has historically thrown on write, some
 * browsers throw on merely *touching* `localStorage` when cookies are blocked, and
 * the patient app ships through Capacitor from a `capacitor://` origin, whose
 * storage behaviour is a WebView setting rather than a guarantee. A language
 * preference is a convenience; failing to read one must never stop an application
 * from starting. So it is resolved once, defensively, behind a token that tests can
 * replace.
 */
export const LANGUAGE_STORAGE = new InjectionToken<Storage | null>('LANGUAGE_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      // Access itself can throw when storage is blocked. No storage, no preference.
      return null;
    }
  },
});

/**
 * Reads the stored language, falling back to {@link DEFAULT_LANGUAGE}.
 *
 * Anything that is not exactly `'en'` or `'ar'` is a fallback: an absent value, a
 * value from an older format, a value someone typed into devtools, a value from a
 * future release that added a language this build does not have.
 */
export function readStoredLanguage(storage: Storage | null): Language {
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);

    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    // A storage that throws on read is a storage that does not exist, as far as a
    // language preference is concerned.
    return DEFAULT_LANGUAGE;
  }
}

/** Stores the chosen language. A storage failure is deliberately not fatal. */
export function writeStoredLanguage(storage: Storage | null, language: Language): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Out of quota, or storage is blocked. The language still changed for this
    // session; it just will not be remembered. That is not worth an error to a user.
  }
}

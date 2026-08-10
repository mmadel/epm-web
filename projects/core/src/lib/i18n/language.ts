/**
 * The languages the product ships in.
 *
 * Arabic and English are both first-class: the product ships to Egypt and the Gulf.
 * The set is deliberately closed - two values, no string escape hatch - so that a
 * typo or a stale stored value cannot become a third "language" that no translation
 * file covers.
 *
 * Numerals are Western (1, 2, 3) in both languages. That is a product decision, so
 * there is no numeral conversion anywhere in this codebase.
 */
export type Language = 'en' | 'ar';

/** Every supported language, in the order they are offered to a user. */
export const LANGUAGES: readonly Language[] = ['en', 'ar'] as const;

/** The language used when nothing has been chosen or the stored choice is unusable. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** Narrows an unknown value (a stored string, a URL fragment) to a {@link Language}. */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

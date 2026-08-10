import { Language } from './language';

/** Writing direction of the document. Arabic is right-to-left; English is left-to-right. */
export type Direction = 'ltr' | 'rtl';

/**
 * The document attributes each language implies.
 *
 * `lang` and `dir` live in one table, as one value per language, because they are
 * not two independent settings - a document that says `lang="ar" dir="ltr"` is
 * simply broken, and broken in a way that looks fine to a reader who does not read
 * Arabic. Keeping them in a pair makes "set one, forget the other" unrepresentable.
 */
const DOCUMENT_ATTRIBUTES: Record<Language, { readonly lang: Language; readonly dir: Direction }> =
  {
    en: { lang: 'en', dir: 'ltr' },
    ar: { lang: 'ar', dir: 'rtl' },
  };

/** The writing direction of a language. */
export function directionOf(language: Language): Direction {
  return DOCUMENT_ATTRIBUTES[language].dir;
}

/**
 * Applies a language to the document element: `lang` and `dir`, together, always.
 *
 * THIS IS THE ONLY PLACE IN THE WORKSPACE THAT WRITES EITHER ATTRIBUTE. It is
 * written as a single function taking a single language, reading a single pair from
 * {@link DOCUMENT_ATTRIBUTES}, so there is no signature through which a caller could
 * set the direction without the language or the other way round. Everything that
 * changes the language goes through the one `effect` in `LanguageService` that calls
 * this function; nothing calls `setAttribute('dir', …)` anywhere else.
 *
 * The document is passed in rather than reached for as a global so that this is
 * testable, and so that a non-browser document (server-side rendering, a test
 * harness) works unchanged.
 */
export function applyDocumentLanguage(documentRef: Document, language: Language): void {
  const { lang, dir } = DOCUMENT_ATTRIBUTES[language];
  const root = documentRef.documentElement;

  root.setAttribute('lang', lang);
  root.setAttribute('dir', dir);
}

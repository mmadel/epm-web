import { Language } from 'core';

import { TranslationDictionary } from './translation-service';

/**
 * A two-language dictionary for tests, in which the two languages differ.
 *
 * The shipped Arabic files hold English placeholders on purpose (see
 * translations/README.md), so the real strings are identical in both languages and
 * cannot show that a language change changed anything. These values are marked
 * `(en)` / `(ar)` rather than being written in Arabic: no Arabic prose is written
 * anywhere in this repository until a clinician has signed it off, and that includes
 * fixtures, which have a way of being copied into production files.
 */
export const TRANSLATIONS_FIXTURE: Readonly<Record<Language, TranslationDictionary>> = {
  en: {
    'shell.header.title': 'EPM (en)',
    'common.action.save': 'Save (en)',
    'common.upload.limit': 'Up to {limit} files (en)',
    'common.upload.rejected': 'Asked for {requested}, limit is {limit} (en)',
  },
  ar: {
    'shell.header.title': 'EPM (ar)',
    'common.action.save': 'Save (ar)',
    'common.upload.limit': 'Up to {limit} files (ar)',
    'common.upload.rejected': 'Asked for {requested}, limit is {limit} (ar)',
  },
};

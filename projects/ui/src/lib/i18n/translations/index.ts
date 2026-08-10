import { Language } from 'core';

import { commonAr } from './common.ar';
import { commonEn } from './common.en';
import { errorsAr } from './errors.ar';
import { errorsEn } from './errors.en';
import { shellAr } from './shell.ar';
import { shellEn } from './shell.en';

// ---------------------------------------------------------------------------
// Translations are split by feature area, two files per area (`<area>.en.ts`
// and `<area>.ar.ts`), and merged here.
//
// TO ADD AN AREA: create `<area>.en.ts` and `<area>.ar.ts` next to these (copy
// the shape of shell.en.ts / shell.ar.ts), then add the two spreads below. That
// is the whole procedure - there is no registration list, no asset glob and no
// build step. The `errors` area was added exactly this way.
//
// Conventions are documented in ./README.md, including the reason the Arabic
// files currently hold English.
// ---------------------------------------------------------------------------

const en = {
  ...commonEn,
  ...errorsEn,
  ...shellEn,
};

const ar = {
  ...commonAr,
  ...errorsAr,
  ...shellAr,
};

/**
 * Every key the product can ask for. English is the source of truth for the key
 * set: it is the language the strings are written in first.
 */
export type TranslationKey = keyof typeof en;

/** A complete set of strings for one language. */
export type Translations = Record<TranslationKey, string>;

// English defines the key set; this annotation makes a missing Arabic key a
// compile error rather than a blank label discovered in production. The
// per-area `Record<…Key, string>` annotations catch a surplus key the same way.
const arabic: Translations = ar;

/** The strings for every supported language. */
export const TRANSLATIONS: Readonly<Record<Language, Translations>> = {
  en,
  ar: arabic,
};

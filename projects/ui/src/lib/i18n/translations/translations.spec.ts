import { TRANSLATIONS } from './index';

/** Arabic, Arabic Supplement and the two Arabic Presentation Forms blocks. */
const ARABIC_BLOCKS: readonly (readonly [number, number])[] = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

// Compared by code point rather than matched against a character class, so that this
// file contains no right-to-left characters of its own.
function containsArabicScript(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return ARABIC_BLOCKS.some(([first, last]) => codePoint >= first && codePoint <= last);
  });
}

describe('TRANSLATIONS', () => {
  it('covers every supported language', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(['ar', 'en']);
  });

  it('has identical key sets in every language', () => {
    // The types already enforce this at compile time; asserting it at runtime as
    // well means a future change that widens a type cannot quietly lose a key.
    const english = Object.keys(TRANSLATIONS.en).sort();
    const arabic = Object.keys(TRANSLATIONS.ar).sort();

    expect(arabic).toEqual(english);
  });

  it('has a non-empty value for every key in every language', () => {
    for (const [language, translations] of Object.entries(TRANSLATIONS)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value.trim(), `${language} value for "${key}"`).not.toBe('');
      }
    }
  });

  it('prefixes every key with the area it belongs to', () => {
    const areas = ['common', 'shell'];

    for (const key of Object.keys(TRANSLATIONS.en)) {
      expect(areas, `area of "${key}"`).toContain(key.split('.')[0]);
    }
  });

  it('names every key as area.context.name', () => {
    for (const key of Object.keys(TRANSLATIONS.en)) {
      expect(key).toMatch(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/);
    }
  });

  it('splits the keys across more than one area', () => {
    const areas = new Set(Object.keys(TRANSLATIONS.en).map((key) => key.split('.')[0]));

    expect(areas.size).toBeGreaterThan(1);
  });

  // The two tests below pin the placeholder state described in ./README.md. They do
  // not assert that things are right - they assert that the gap is where we left it.
  // When a clinician has signed off real Arabic, both fail, and deleting them is
  // part of that change.
  it('has Arabic values that are still the English placeholders', () => {
    expect(TRANSLATIONS.ar).toEqual(TRANSLATIONS.en);
  });

  it('contains no Arabic script anywhere', () => {
    // Machine translation is the failure mode this guards against: plausible Arabic
    // that nobody has approved reads as finished work and ships.
    for (const [language, translations] of Object.entries(TRANSLATIONS)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(containsArabicScript(value), `${language} value for "${key}"`).toBe(false);
      }
    }
  });
});

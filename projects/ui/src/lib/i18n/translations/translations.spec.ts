import { TRANSLATIONS } from './index';

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
});

import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES } from './language';

describe('Language', () => {
  it('supports exactly English and Arabic', () => {
    expect([...LANGUAGES]).toEqual(['en', 'ar']);
  });

  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('recognises the supported languages', () => {
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('ar')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLanguage('EN')).toBe(false);
    expect(isLanguage('en-US')).toBe(false);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage('')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
    expect(isLanguage(0)).toBe(false);
  });
});

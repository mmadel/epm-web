import { fakeStorage, throwingStorage } from './language-storage.fixture';
import { LANGUAGE_STORAGE_KEY, readStoredLanguage, writeStoredLanguage } from './language-storage';

describe('readStoredLanguage', () => {
  it('reads a stored language', () => {
    expect(readStoredLanguage(fakeStorage({ [LANGUAGE_STORAGE_KEY]: 'ar' }))).toBe('ar');
    expect(readStoredLanguage(fakeStorage({ [LANGUAGE_STORAGE_KEY]: 'en' }))).toBe('en');
  });

  it('falls back to English when nothing is stored', () => {
    expect(readStoredLanguage(fakeStorage())).toBe('en');
  });

  it('falls back to English for a value that is not a supported language', () => {
    for (const stored of ['fr', 'AR', 'ar-EG', '', 'null', '{"language":"ar"}']) {
      expect(readStoredLanguage(fakeStorage({ [LANGUAGE_STORAGE_KEY]: stored }))).toBe('en');
    }
  });

  it('falls back to English when there is no storage at all', () => {
    // The patient app runs from a capacitor:// origin, and a browser with cookies
    // blocked can leave the application with no storage at all.
    expect(readStoredLanguage(null)).toBe('en');
  });

  it('falls back to English when the storage throws', () => {
    expect(readStoredLanguage(throwingStorage())).toBe('en');
  });
});

describe('writeStoredLanguage', () => {
  it('stores the language', () => {
    const storage = fakeStorage();

    writeStoredLanguage(storage, 'ar');

    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
  });

  it('overwrites a previous choice', () => {
    const storage = fakeStorage({ [LANGUAGE_STORAGE_KEY]: 'ar' });

    writeStoredLanguage(storage, 'en');

    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('does nothing when there is no storage', () => {
    expect(() => writeStoredLanguage(null, 'ar')).not.toThrow();
  });

  it('swallows a storage that throws', () => {
    // Out of quota or blocked storage must not surface as an error to a user who
    // just picked a language.
    expect(() => writeStoredLanguage(throwingStorage(), 'ar')).not.toThrow();
  });
});

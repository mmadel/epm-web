import { TestBed } from '@angular/core/testing';
import { LanguageService } from 'core';

import { TranslationService, TRANSLATIONS_SOURCE } from './translation-service';
import { TRANSLATIONS_FIXTURE } from './translations.fixture';

describe('TranslationService', () => {
  let translations: TranslationService;
  let language: LanguageService;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [{ provide: TRANSLATIONS_SOURCE, useValue: TRANSLATIONS_FIXTURE }],
    });
    translations = TestBed.inject(TranslationService);
    language = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('resolves a key in the active language', () => {
    expect(translations.translate('common.action.save')).toBe('Save (en)');
  });

  it('resolves the same key differently after the language changes', () => {
    language.setLanguage('ar');

    expect(translations.translate('common.action.save')).toBe('Save (ar)');
  });

  it('substitutes a named parameter', () => {
    expect(translations.translate('common.upload.limit', { limit: 5 })).toBe('Up to 5 files (en)');
  });

  it('substitutes several named parameters', () => {
    expect(translations.translate('common.upload.rejected', { requested: 9, limit: 5 })).toBe(
      'Asked for 9, limit is 5 (en)',
    );
  });

  it('accepts string parameters as well as numbers', () => {
    expect(translations.translate('common.upload.limit', { limit: 'a few' })).toBe(
      'Up to a few files (en)',
    );
  });

  it('leaves a placeholder in place when its parameter is missing', () => {
    // Visible and reportable, unlike a silently emptied placeholder.
    expect(translations.translate('common.upload.limit', { unrelated: 1 })).toBe(
      'Up to {limit} files (en)',
    );
  });

  it('renders the key itself when the key is unknown', () => {
    expect(translations.translate('shell.nav.nonexistent')).toBe('shell.nav.nonexistent');
  });

  it('never renders an empty string for an unknown key', () => {
    expect(translations.translate('shell.nav.nonexistent').trim()).not.toBe('');
  });

  it('logs an unknown key, naming the key and the language', () => {
    translations.translate('shell.nav.nonexistent');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('shell.nav.nonexistent');
    expect(String(warn.mock.calls[0]?.[0])).toContain('en');
  });

  it('logs an unknown key once per language, not once per lookup', () => {
    // The pipe is impure and re-runs on every change detection pass; logging every
    // time would bury the console and hide the next missing key.
    translations.translate('shell.nav.nonexistent');
    translations.translate('shell.nav.nonexistent');
    translations.translate('shell.nav.nonexistent');

    expect(warn).toHaveBeenCalledTimes(1);

    language.setLanguage('ar');
    translations.translate('shell.nav.nonexistent');

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('does not log a key that exists', () => {
    translations.translate('common.action.save');

    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the shipped translations when nothing is provided', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(TranslationService).translate('shell.header.title')).toBe(
      'Elite Physical Medicine',
    );
  });
});

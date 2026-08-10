import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language-service';

describe('LanguageService', () => {
  let service: LanguageService;
  let documentRef: Document;

  /** The `lang`/`dir` pair currently on the document element. */
  function documentAttributes(): { lang: string | null; dir: string | null } {
    return {
      lang: documentRef.documentElement.getAttribute('lang'),
      dir: documentRef.documentElement.getAttribute('dir'),
    };
  }

  beforeEach(() => {
    // A throwaway document, so these tests neither read nor corrupt the one the
    // test runner renders into.
    documentRef = document.implementation.createHTMLDocument('test');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentRef }],
    });
    service = TestBed.inject(LanguageService);
    TestBed.tick();
  });

  it('starts in English', () => {
    expect(service.language()).toBe('en');
  });

  it('labels the document on creation, before anything changes', () => {
    expect(documentAttributes()).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('changes the language', () => {
    service.setLanguage('ar');

    expect(service.language()).toBe('ar');
  });

  it('changes back', () => {
    service.setLanguage('ar');
    service.setLanguage('en');

    expect(service.language()).toBe('en');
  });

  it('relabels the document when the language changes', () => {
    service.setLanguage('ar');
    TestBed.tick();

    expect(documentAttributes()).toEqual({ lang: 'ar', dir: 'rtl' });

    service.setLanguage('en');
    TestBed.tick();

    expect(documentAttributes()).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('exposes the language read-only', () => {
    // The exposed signal must not carry a `set`/`update`, so that setLanguage is
    // the only way the active language can change.
    const exposed = service.language as unknown as Record<string, unknown>;

    expect(exposed['set']).toBeUndefined();
    expect(exposed['update']).toBeUndefined();
  });

  it('is a singleton in the root injector', () => {
    expect(TestBed.inject(LanguageService)).toBe(service);
  });
});

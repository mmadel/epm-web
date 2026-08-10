import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language-service';
import { LANGUAGE_STORAGE, LANGUAGE_STORAGE_KEY } from './language-storage';
import { fakeStorage, throwingStorage } from './language-storage.fixture';

describe('LanguageService', () => {
  let service: LanguageService;
  let documentRef: Document;
  let storage: Storage;

  /** The `lang`/`dir` pair currently on the document element. */
  function documentAttributes(): { lang: string | null; dir: string | null } {
    return {
      lang: documentRef.documentElement.getAttribute('lang'),
      dir: documentRef.documentElement.getAttribute('dir'),
    };
  }

  /**
   * Builds the service against a given document and storage.
   *
   * Creating it a second time against the same storage is what a reload looks like
   * from this code's point of view: a new service, same persisted preference.
   */
  function createService(withStorage: Storage | null = storage): LanguageService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: documentRef },
        { provide: LANGUAGE_STORAGE, useValue: withStorage },
      ],
    });

    const created = TestBed.inject(LanguageService);
    TestBed.tick();

    return created;
  }

  beforeEach(() => {
    // A throwaway document, so these tests neither read nor corrupt the one the
    // test runner renders into, and an in-memory storage for the same reason.
    documentRef = document.implementation.createHTMLDocument('test');
    storage = fakeStorage();
    service = createService();
  });

  it('starts in English when nothing has been chosen', () => {
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

  describe('persistence', () => {
    it('stores the chosen language', () => {
      service.setLanguage('ar');

      expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
    });

    it('does not store anything when nobody has chosen', () => {
      expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    });

    it('keeps the choice across a reload', () => {
      service.setLanguage('ar');

      // A reload: a brand new service reading the same storage.
      const reloaded = createService();

      expect(reloaded.language()).toBe('ar');
      expect(documentAttributes()).toEqual({ lang: 'ar', dir: 'rtl' });
    });

    it('keeps a switch back to English across a reload', () => {
      service.setLanguage('ar');
      createService().setLanguage('en');

      expect(createService().language()).toBe('en');
    });

    it('starts in English when the stored value is not a language', () => {
      storage.setItem(LANGUAGE_STORAGE_KEY, 'de');

      expect(createService().language()).toBe('en');
    });

    it('starts in English, and starts at all, when there is no storage', () => {
      const withoutStorage = createService(null);

      expect(withoutStorage.language()).toBe('en');
      expect(documentAttributes()).toEqual({ lang: 'en', dir: 'ltr' });
    });

    it('starts in English, and starts at all, when the storage throws', () => {
      // Bootstrap must survive a browser that refuses storage; the patient app runs
      // from a capacitor:// origin and private browsing modes throw here.
      const broken = createService(throwingStorage());

      expect(broken.language()).toBe('en');
      expect(documentAttributes()).toEqual({ lang: 'en', dir: 'ltr' });
    });

    it('still switches language when the storage refuses to write', () => {
      const broken = createService(throwingStorage());

      expect(() => broken.setLanguage('ar')).not.toThrow();
      expect(broken.language()).toBe('ar');
    });
  });
});

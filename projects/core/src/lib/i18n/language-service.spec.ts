import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language-service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  it('starts in English', () => {
    expect(service.language()).toBe('en');
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

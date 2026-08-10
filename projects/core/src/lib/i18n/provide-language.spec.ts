import { ApplicationRef, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language-service';
import { provideLanguage } from './provide-language';

describe('provideLanguage', () => {
  it('labels the document without anything having injected the service', () => {
    const documentRef = document.implementation.createHTMLDocument('test');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentRef }, provideLanguage()],
    });

    // Only the application is started here; nothing asks for LanguageService.
    TestBed.inject(ApplicationRef);
    TestBed.tick();

    expect(documentRef.documentElement.getAttribute('lang')).toBe('en');
    expect(documentRef.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('leaves the document unlabelled when it is not used', () => {
    const documentRef = document.implementation.createHTMLDocument('test');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentRef }],
    });
    TestBed.inject(ApplicationRef);
    TestBed.tick();

    expect(documentRef.documentElement.getAttribute('lang')).toBeNull();
    expect(documentRef.documentElement.getAttribute('dir')).toBeNull();
  });

  it('still exposes the same singleton service', () => {
    const documentRef = document.implementation.createHTMLDocument('test');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentRef }, provideLanguage()],
    });

    expect(TestBed.inject(LanguageService)).toBe(TestBed.inject(LanguageService));
  });
});

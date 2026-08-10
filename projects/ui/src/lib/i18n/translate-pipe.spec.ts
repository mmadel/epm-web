import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LANGUAGE_STORAGE, LanguageService } from 'core';

import { TranslatePipe } from './translate-pipe';
import { TRANSLATIONS_SOURCE } from './translation-service';
import { TRANSLATIONS_FIXTURE } from './translations.fixture';

@Component({
  selector: 'lib-translate-host',
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'common.action.save' | translate }}</h1>
    <p>{{ 'common.upload.limit' | translate: { limit: 5 } }}</p>
    <small>{{ 'shell.nav.nonexistent' | translate }}</small>
  `,
})
class TranslateHost {}

describe('TranslatePipe', () => {
  let fixture: ComponentFixture<TranslateHost>;
  let language: LanguageService;

  function textOf(selector: string): string {
    return (
      (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? ''
    );
  }

  beforeEach(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: TRANSLATIONS_SOURCE, useValue: TRANSLATIONS_FIXTURE },
        // No storage: a language chosen in one test must not be remembered by the
        // next one. Persistence is covered by core's own specs.
        { provide: LANGUAGE_STORAGE, useValue: null },
      ],
    });
    fixture = TestBed.createComponent(TranslateHost);
    language = TestBed.inject(LanguageService);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the string for the active language', () => {
    expect(textOf('h1')).toBe('Save (en)');
  });

  it('re-renders when the language changes, with no reload and no new component', async () => {
    // The proof that the pipe is impure. A pure pipe caches on its argument - the
    // key - which does not change when the language does, so this text would still
    // read "Save (en)" here.
    //
    // Nothing forces change detection: the language signal is read inside the pipe
    // during the view's update pass, so the view is a consumer of it and setting it
    // marks the view dirty on its own.
    const instance = fixture.componentInstance;
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');

    language.setLanguage('ar');
    await fixture.whenStable();

    expect(textOf('h1')).toBe('Save (ar)');
    expect(fixture.componentInstance).toBe(instance);
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).toBe(heading);
  });

  it('switches back again', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();

    expect(textOf('h1')).toBe('Save (ar)');

    language.setLanguage('en');
    await fixture.whenStable();

    expect(textOf('h1')).toBe('Save (en)');
  });

  it('substitutes parameters passed from the template', () => {
    expect(textOf('p')).toBe('Up to 5 files (en)');
  });

  it('re-renders parameterised strings when the language changes', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();

    expect(textOf('p')).toBe('Up to 5 files (ar)');
  });

  it('renders an unknown key as the key, never as a blank label', () => {
    expect(textOf('small')).toBe('shell.nav.nonexistent');
  });
});

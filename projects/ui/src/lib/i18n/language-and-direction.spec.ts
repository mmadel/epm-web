import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Language, LANGUAGE_STORAGE, LANGUAGE_STORAGE_KEY, LanguageService } from 'core';

import { TranslatePipe } from './translate-pipe';
import { TRANSLATIONS_SOURCE } from './translation-service';
import { TRANSLATIONS_FIXTURE } from './translations.fixture';

/**
 * The behaviour of the whole mechanism, rather than of any one piece: a component
 * rendering translated text while the document is labelled for the active language.
 *
 * These tests run against the real document, not a throwaway one, because the point
 * of them is that the thing a user sees and the thing a stylesheet reads agree.
 */
@Component({
  selector: 'lib-language-and-direction-host',
  imports: [TranslatePipe],
  template: `
    <h1>{{ 'shell.header.title' | translate }}</h1>
    <p>{{ 'shell.nav.no-such-key' | translate }}</p>
  `,
})
class LanguageAndDirectionHost {}

/** An in-memory Storage, so a stored preference cannot leak between tests. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));

  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) => void entries.set(key, value),
  };
}

describe('language and direction', () => {
  let fixture: ComponentFixture<LanguageAndDirectionHost>;
  let language: LanguageService;
  let storage: Storage;
  let warn: ReturnType<typeof vi.spyOn>;

  function heading(): string {
    return (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent?.trim() ?? '';
  }

  /**
   * Asserts the document element carries the `lang`/`dir` pair for `expected`.
   *
   * Both attributes, every time, in one assertion: a change that updated one of them
   * without the other fails here rather than being noticed by an Arabic-speaking
   * user. The test named "catches a one-sided change" below proves this assertion
   * actually has that power, instead of being assumed to.
   */
  function expectLabelledFor(expected: Language): void {
    expect({
      lang: document.documentElement.getAttribute('lang'),
      dir: document.documentElement.getAttribute('dir'),
    }).toEqual(expected === 'ar' ? { lang: 'ar', dir: 'rtl' } : { lang: 'en', dir: 'ltr' });
  }

  /** Builds the component and the language mechanism afresh, against `withStorage`. */
  async function startWith(withStorage: Storage): Promise<void> {
    storage = withStorage;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: TRANSLATIONS_SOURCE, useValue: TRANSLATIONS_FIXTURE },
        { provide: LANGUAGE_STORAGE, useValue: withStorage },
      ],
    });

    fixture = TestBed.createComponent(LanguageAndDirectionHost);
    language = TestBed.inject(LanguageService);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await startWith(fakeStorage());
  });

  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
    vi.restoreAllMocks();
  });

  it('starts in English, left to right', () => {
    expect(heading()).toBe('Elite Physical Medicine (en)');
    expectLabelledFor('en');
  });

  it('flips text and direction together, with no reload', async () => {
    const instance = fixture.componentInstance;

    language.setLanguage('ar');
    await fixture.whenStable();

    expect(heading()).toBe('Elite Physical Medicine (ar)');
    expectLabelledFor('ar');
    // Same component: the text changed, the application was not rebuilt.
    expect(fixture.componentInstance).toBe(instance);
  });

  it('flips back again', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();
    language.setLanguage('en');
    await fixture.whenStable();

    expect(heading()).toBe('Elite Physical Medicine (en)');
    expectLabelledFor('en');
  });

  it('keeps lang and dir in agreement through repeated changes', async () => {
    for (const next of ['ar', 'en', 'ar', 'ar', 'en'] as const) {
      language.setLanguage(next);
      await fixture.whenStable();

      expectLabelledFor(next);
    }
  });

  it('catches a one-sided change', async () => {
    // Guards the guard. If someone replaced the single applyDocumentLanguage call
    // with two independent writes and updated only one of them, the document would
    // look like this - and every assertion above would fail. This test fails if the
    // pair assertion ever stops noticing.
    language.setLanguage('ar');
    await fixture.whenStable();

    document.documentElement.setAttribute('dir', 'ltr');

    expect(() => expectLabelledFor('ar')).toThrow();

    document.documentElement.setAttribute('lang', 'en');

    expect(() => expectLabelledFor('ar')).toThrow();
  });

  it('renders a missing key as the key, and logs it', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('p')?.textContent?.trim()).toBe(
      'shell.nav.no-such-key',
    );
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain('shell.nav.no-such-key');
  });

  it('keeps a chosen language across a reload', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();

    // A reload: everything is built again, and the only thing that survives is the
    // storage the running application wrote to - not a value planted by the test.
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
    await startWith(storage);

    expect(heading()).toBe('Elite Physical Medicine (ar)');
    expectLabelledFor('ar');
  });

  it('starts in English after a reload with nothing stored', async () => {
    await startWith(fakeStorage());

    expect(heading()).toBe('Elite Physical Medicine (en)');
    expectLabelledFor('en');
  });

  it('starts in English after a reload with a nonsense stored value', async () => {
    await startWith(fakeStorage({ [LANGUAGE_STORAGE_KEY]: 'not-a-language' }));

    expect(heading()).toBe('Elite Physical Medicine (en)');
    expectLabelledFor('en');
  });
});

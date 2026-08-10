import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LANGUAGE_STORAGE, LanguageService } from 'core';

import { LanguageSwitch } from './language-switch';

/** An in-memory Storage, so a language preference cannot leak between tests. */
function fakeStorage(): Storage {
  const entries = new Map<string, string>();

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

describe('LanguageSwitch', () => {
  let fixture: ComponentFixture<LanguageSwitch>;
  let language: LanguageService;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function select(): HTMLSelectElement {
    return element().querySelector<HTMLSelectElement>('.language-switch__select')!;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LANGUAGE_STORAGE, useValue: fakeStorage() }],
    });

    fixture = TestBed.createComponent(LanguageSwitch);
    language = TestBed.inject(LanguageService);
    await fixture.whenStable();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('labels the control from a translation key', () => {
    const label = element().querySelector('.language-switch__label');

    expect(label?.textContent?.trim()).toBe('Language');
    // The label has to be attached to the control, not merely near it.
    expect(label?.getAttribute('for')).toBe(select().id);
  });

  it('offers every supported language, labelled from translation keys', () => {
    const options = [...element().querySelectorAll<HTMLOptionElement>('option')];

    expect(options.map((option) => option.value)).toEqual(['en', 'ar']);
    expect(options.map((option) => option.textContent?.trim())).toEqual(['English', 'Arabic']);
  });

  it('shows the active language as the selected one', () => {
    expect(select().value).toBe('en');
  });

  it('switches the language through the language service, which relabels the document', async () => {
    select().value = 'ar';
    select().dispatchEvent(new Event('change'));
    await fixture.whenStable();

    // The switch asked; the service decided, and is the only thing that touched
    // the document. A switch that wrote `dir` itself would pass the two
    // assertions below and still be wrong, so the first one - that the service's
    // own state changed - is the one that matters.
    expect(language.language()).toBe('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('follows the language when something else changes it', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();

    expect(select().value).toBe('ar');
  });
});

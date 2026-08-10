import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LANGUAGE_STORAGE, LanguageService } from 'core';

import { Shell, ShellNavigationItem } from './shell';

/**
 * A host, rather than creating the shell directly, because two of the things worth
 * asserting about a frame only exist when something is mounted inside one: that the
 * projected content lands in the content region, and that the shell renders entries it
 * was given rather than entries it invented.
 */
@Component({
  selector: 'lib-shell-spec-host',
  imports: [Shell],
  template: `
    <lib-shell [navigation]="navigation()">
      <p class="projected">Projected content</p>
    </lib-shell>
  `,
})
class ShellSpecHost {
  // A signal, so a test can change the entries and have the change reach the shell
  // without depending on how the fixture happens to schedule change detection.
  readonly navigation = signal<readonly ShellNavigationItem[]>([
    { labelKey: 'shell.nav.dashboard', link: '/dashboard' },
    { labelKey: 'shell.nav.patients', link: '/patients' },
  ]);
}

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

describe('Shell', () => {
  let fixture: ComponentFixture<ShellSpecHost>;
  let language: LanguageService;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function query<T extends Element>(selector: string): T | null {
    return element().querySelector<T>(selector);
  }

  function text(selector: string): string {
    return query(selector)?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LANGUAGE_STORAGE, useValue: fakeStorage() }],
    });

    fixture = TestBed.createComponent(ShellSpecHost);
    language = TestBed.inject(LanguageService);
    await fixture.whenStable();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('renders the product title from a translation key', () => {
    expect(text('.shell-title')).toBe('Elite Physical Medicine');
  });

  it('labels the navigation landmark', () => {
    expect(query('nav')?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('renders one entry per navigation item, with translated labels and its links', () => {
    const links = [...element().querySelectorAll<HTMLAnchorElement>('.shell-nav__link')];

    expect(links.map((link) => link.textContent?.trim())).toEqual(['Dashboard', 'Patients']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/patients']);
  });

  it('renders no navigation entries when it was given none', async () => {
    fixture.componentInstance.navigation.set([]);
    await fixture.whenStable();

    expect(element().querySelectorAll('.shell-nav__link')).toHaveLength(0);
    // The landmark itself stays: a frame with nothing in its navigation is still a
    // frame, which is the state the patient app will mount this in.
    expect(query('nav')).not.toBeNull();
  });

  it('projects content into the main region', () => {
    expect(query('main.shell-main .projected')?.textContent).toBe('Projected content');
  });

  it('points the skip link at the main region', () => {
    // A skip link whose target id was renamed still looks fine and does nothing.
    const target = query('.shell-skip-link')?.getAttribute('href');

    expect(target).toBe('#shell-main');
    expect(query(`main${target}`)).not.toBeNull();
  });

  it('offers every supported language, labelled from translation keys', () => {
    const options = [
      ...element().querySelectorAll<HTMLOptionElement>('.shell-language__select option'),
    ];

    expect(options.map((option) => option.value)).toEqual(['en', 'ar']);
    expect(options.map((option) => option.textContent?.trim())).toEqual(['English', 'Arabic']);
  });

  it('shows the active language as the selected one', () => {
    expect(query<HTMLSelectElement>('.shell-language__select')?.value).toBe('en');
  });

  it('switches the language through the language service, which relabels the document', async () => {
    const select = query<HTMLSelectElement>('.shell-language__select');

    select!.value = 'ar';
    select!.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    // The shell asked; the service decided, and is the only thing that touched the
    // document. A shell that wrote `dir` itself would pass the two assertions below
    // and still be wrong, so the first one - that the service's own state changed -
    // is the one that matters.
    expect(language.language()).toBe('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('writes no direction of its own onto any element it renders', async () => {
    language.setLanguage('ar');
    await fixture.whenStable();

    // Direction is a document-level fact owned by `core`. Anything inside the shell
    // carrying its own `dir` is a second source of truth, and the one that will be
    // forgotten when the other changes.
    expect(element().querySelectorAll('[dir]')).toHaveLength(0);
  });
});

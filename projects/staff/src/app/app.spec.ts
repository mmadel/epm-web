import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { ROUTE_PATHS } from './route-paths';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('mounts the shared shell with no navigation landmark at all', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // NOT AN EMPTY NAVIGATION, which is a different state and different markup: a
    // landmark that announces itself and then contains nothing is worse for a screen
    // reader than no landmark. This console has none - the home screen carries a card
    // into every area - so the frame is given no `navigation` input.
    expect(compiled.querySelector('lib-shell')).not.toBeNull();
    expect(compiled.querySelector('nav')).toBeNull();
  });

  it('says which console this is, in the wordmark, and links it home', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // A person can hold an account in this console and in the platform one, and the
    // two run under opposite tenancy rules. "Which application am I in" has to be
    // answerable without reading the address bar.
    const wordmark = compiled.querySelector('.shell-header__start lib-wordmark');

    expect(wordmark?.querySelector('.wordmark__product')?.textContent?.trim()).toBe('EPM');
    expect(wordmark?.querySelector('.wordmark__console')?.textContent?.trim()).toBe('Staff');
    expect(wordmark?.querySelector('a')?.getAttribute('href')).toBe(ROUTE_PATHS.home);
  });

  it('puts the language switch in the frame it mounts', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // The frame translates nothing and offers no language control, so a bilingual
    // product has to supply one.
    expect(compiled.querySelector('.shell-header__end lib-language-switch')).not.toBeNull();
  });

  it('projects the routed outlet into the shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // The content region holds the outlet and nothing else: what a route renders is
    // the route's business, and the frame's job is to still be there around it.
    expect(compiled.querySelector('main.shell-main router-outlet')).not.toBeNull();
  });
});

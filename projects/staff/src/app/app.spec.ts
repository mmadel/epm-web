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

  it('mounts the shared shell and fills its navigation, in order', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // The console owns which entries exist; the shell owns how a frame looks. This
    // asserts the wiring between the two, not the shell's own behaviour, which is
    // covered where the shell lives.
    //
    // THE ORDER IS THE ASSERTION as much as the membership. It is containment - a
    // practice has clinics, clinics have staff, all of it under one subscription -
    // and a set comparison would pass on an alphabetical console.
    expect(compiled.querySelector('lib-shell')).not.toBeNull();
    expect(
      [...compiled.querySelectorAll('.shell-nav__link')].map((link) => link.textContent?.trim()),
    ).toEqual(['Practice details', 'Clinics', 'Staff', 'Subscription']);
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
    expect(wordmark?.querySelector('a')?.getAttribute('href')).toBe(ROUTE_PATHS.practice);
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

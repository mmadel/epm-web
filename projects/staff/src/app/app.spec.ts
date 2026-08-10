import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

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

  it('mounts the shared shell and fills its navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // The console owns which entries exist; the shell owns how a frame looks. This
    // asserts the wiring between the two, not the shell's own behaviour, which is
    // covered where the shell lives.
    expect(compiled.querySelector('lib-shell')).not.toBeNull();
    expect(
      [...compiled.querySelectorAll('.shell-nav__link')].map((link) => link.textContent?.trim()),
    ).toEqual(['Dashboard', 'Patients', 'Appointments', 'Billing']);
  });

  it('puts the product title and the language switch in the frame it mounts', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // Both are this console's decision rather than the frame's: the frame
    // translates nothing and offers no language control, so a bilingual product
    // has to supply one.
    expect(compiled.querySelector('.shell-header__start')?.textContent?.trim()).toBe(
      'Elite Physical Medicine',
    );
    expect(compiled.querySelector('.shell-header__end lib-language-switch')).not.toBeNull();
  });

  it('projects its content into the shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // No route table yet, so the console shows the shared empty state rather than a
    // blank area with no explanation.
    expect(compiled.querySelector('main.shell-main')?.textContent).toContain('Nothing to show');
  });
});

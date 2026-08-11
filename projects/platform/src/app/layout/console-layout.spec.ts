import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { LANGUAGE_STORAGE, PlatformAdminSession, providePlatformAdminSession } from 'core';

import { provideEnvironmentName } from '../environment/environment-name';
import { ConsoleLayout, initialsOf } from './console-layout';

@Component({
  selector: 'app-first-page',
  template: '<h1 tabindex="-1">New practice</h1>',
})
class FirstPage {}

@Component({
  selector: 'app-second-page',
  template: '<h1 tabindex="-1">Page not found</h1>',
})
class SecondPage {}

@Component({
  selector: 'app-console-layout-spec-host',
  imports: [ConsoleLayout, RouterOutlet],
  template: `
    <app-console-layout>
      <router-outlet />
    </app-console-layout>
  `,
})
class ConsoleLayoutSpecHost {}

const ADMIN: PlatformAdminSession = {
  actor: 'platformAdmin',
  userId: 'u-1',
  displayName: 'Mona Adel',
};

async function render(options?: {
  environment?: unknown;
  admin?: PlatformAdminSession;
}): Promise<ComponentFixture<ConsoleLayoutSpecHost>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', component: FirstPage },
        { path: 'second', component: SecondPage },
      ]),
      providePlatformAdminSession(options?.admin ?? ADMIN),
      provideEnvironmentName(options?.environment ?? 'local'),
      {
        // NOTHING IN THIS CONSOLE MAY READ THE LANGUAGE SERVICE (P-03.2). The
        // service reads its storage while it is being constructed, so a
        // provider that throws turns "something injected LanguageService" from
        // an invisible dependency into a failing test. It never runs while the
        // console behaves.
        provide: LANGUAGE_STORAGE,
        useFactory: () => {
          throw new Error(
            'The platform console read the language service. It is English-only and LTR-only.',
          );
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(ConsoleLayoutSpecHost);
  await TestBed.inject(Router).navigate(['/']);
  await fixture.whenStable();

  return fixture;
}

function element(fixture: ComponentFixture<ConsoleLayoutSpecHost>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('initialsOf', () => {
  it.each([
    ['Mona Adel', 'MA'],
    // First and last, not first and second: "Mona Adel Hassan" is Mona Hassan.
    ['Mona Adel Hassan', 'MH'],
    ['Platform Admin', 'PA'],
    ['Mona', 'M'],
    ['  Mona   Adel  ', 'MA'],
    // Nothing rather than a placeholder that looks like somebody's initials.
    ['', ''],
  ])('reduces %j to %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('ConsoleLayout', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('mounts the shared shell rather than a second one', async () => {
    const fixture = await render();

    expect(element(fixture).querySelector('lib-shell')).not.toBeNull();
  });

  it('renders no navigation landmark, because the console is one screen', async () => {
    const fixture = await render();

    // A tab bar has been tried here twice and removed twice. The second version -
    // the practice as a subject with its parts as tabs - was navigation around a
    // form that fits in one scroll, and it hid fields from the errors that name
    // them. A landmark that announces itself and holds one link is worse than none.
    expect(element(fixture).querySelector('nav')).toBeNull();
  });

  it('renders no language control and never labels the document', async () => {
    const fixture = await render();

    expect(element(fixture).querySelector('select')).toBeNull();
    // The language service is the only thing in the workspace that writes these,
    // and it writes them as soon as it is constructed. Their absence is evidence
    // that it never was.
    expect(document.documentElement.getAttribute('lang')).toBeNull();
    expect(document.documentElement.getAttribute('dir')).toBeNull();
  });

  it('puts the skip link first, pointing at the content', async () => {
    const fixture = await render();
    const skip = element(fixture).querySelector('.shell-skip-link');

    expect(skip?.textContent?.trim()).toBe('Skip to main content');
    expect(skip?.getAttribute('href')).toBe('#shell-main');
    // First focusable thing on the page - a skip link you have to tab to is not
    // a skip link.
    expect(element(fixture).querySelector('a, button, select, input')).toBe(skip);
  });

  // -------------------------------------------------------------------------
  // The wordmark
  // -------------------------------------------------------------------------

  it('makes the wordmark a link home with an accessible name', async () => {
    const fixture = await render();
    const brand = element(fixture).querySelector<HTMLAnchorElement>('.shell-header__start a');

    // A route home rather than a label, so it has to be an `<a>` and not a
    // `<span>`. Somebody builds it as a `<span>` otherwise.
    expect(brand).not.toBeNull();
    expect(brand!.getAttribute('href')).toBe('/onboard');
    expect(brand!.textContent?.replace(/\s+/g, ' ').trim()).toBe('EPM Platform');
  });

  it('does not announce the wordmark glyph, which the words already name', async () => {
    const fixture = await render();

    expect(
      element(fixture).querySelector('.console-brand__mark')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  // -------------------------------------------------------------------------
  // The environment edge
  // -------------------------------------------------------------------------

  it.each([
    ['staging', 'console-edge--warning'],
    ['production', 'console-edge--danger'],
    // A build that did not say gets the loudest treatment there is.
    ['not-an-environment', 'console-edge--danger'],
  ])('draws the edge above the header in %s', async (environment, tone) => {
    const fixture = await render({ environment });
    const edge = element(fixture).querySelector('.console-edge');

    expect(edge?.classList).toContain(tone);
    // Above the header, not merely present: it is the mark a reader takes in
    // before reading anything.
    expect(edge?.closest('.shell-edge')).not.toBeNull();
    expect(
      edge!.compareDocumentPosition(element(fixture).querySelector('.shell-header')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each(['local', 'development'])('draws no edge in %s', async (environment) => {
    const fixture = await render({ environment });
    const edge = element(fixture).querySelector('.console-edge');

    // The edge is for the two environments that look real. Local and
    // development announce themselves through the data in them.
    expect(edge?.classList).not.toContain('console-edge--warning');
    expect(edge?.classList).not.toContain('console-edge--danger');
  });

  it('always renders the environment chip, production included', async () => {
    const fixture = await render({ environment: 'production' });

    expect(element(fixture).querySelector('app-environment-chip')?.textContent).toContain(
      'Production',
    );
  });

  // -------------------------------------------------------------------------
  // The account
  // -------------------------------------------------------------------------

  it('shows the signed-in administrator from the session seam, with no menu', async () => {
    const fixture = await render();
    const account = element(fixture).querySelector<HTMLElement>('.console-account');

    expect(account?.getAttribute('title')).toBe('Mona Adel');
    expect(account?.textContent).toContain('MA');
    // Sign-out belongs with auth, which does not exist yet (P-02.4). A menu with
    // one disabled item in it is worse than no menu.
    expect(element(fixture).querySelector('.console-account button')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  it('moves focus to the heading of the page it navigated to', async () => {
    const fixture = await render();

    await TestBed.inject(Router).navigate(['/second']);
    await fixture.whenStable();

    // Angular's router does not move focus, so without this a keyboard user who
    // follows a link stays where they were and hears nothing.
    const heading = element(fixture).querySelector('main h1');

    expect(heading?.textContent).toBe('Page not found');
    expect(document.activeElement).toBe(heading);
  });

  it('announces the heading politely', async () => {
    const fixture = await render();

    await TestBed.inject(Router).navigate(['/second']);
    await fixture.whenStable();

    const region = element(fixture).querySelector('[aria-live="polite"]');

    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent?.trim()).toBe('Page not found');
  });

  it('announces nothing before the first navigation completes', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: FirstPage }]),
        providePlatformAdminSession(ADMIN),
        provideEnvironmentName('local'),
      ],
    });

    const fixture = TestBed.createComponent(ConsoleLayoutSpecHost);
    fixture.detectChanges();

    // Otherwise the landing page is announced on top of the page load, which is
    // two things talking at once.
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[aria-live="polite"]')
        ?.textContent?.trim(),
    ).toBe('');
  });
});

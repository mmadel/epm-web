import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { BASE_PATH } from 'api-client';
import { API_BASE_URL, provideApiBaseUrl, providePlatformAdminSession } from 'core';

import { App } from './app';
import { routes } from './app.routes';
import { provideEnvironmentName } from './environment/environment-name';
import { PlatformTitleStrategy } from './layout/platform-title-strategy';

/**
 * The whole console, wired the way `app.config.ts` wires it and navigated with
 * the real route table. The pieces have their own specs; this is about what a
 * platform administrator actually lands on.
 */
async function open(url: string, environment = 'production'): Promise<ComponentFixture<App>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
      providePlatformAdminSession(),
      provideEnvironmentName(environment),
      { provide: TitleStrategy, useClass: PlatformTitleStrategy },
      // The onboarding screen reads `listPlans` as it opens, so the console cannot
      // be mounted at all without the client it is wired with. The base URL is the
      // real one's shape - the screen's own spec is what asserts the URLs.
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => inject(API_BASE_URL) },
    ],
  });

  const fixture = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(url);
  TestBed.tick();

  // Whatever the screen asked for as it opened, answered so that nothing is left in
  // flight. `match` rather than `expectOne`: the screens behind "Page not found"
  // ask for nothing at all.
  for (const request of TestBed.inject(HttpTestingController).match(() => true)) {
    request.flush([{ plan: 'STANDARD', seatLimit: 20, branchLimit: 5 }]);
  }

  // The response reaches the resource on a microtask, and the plan select has no
  // options until it does - so a test that chose a plan before this point would be
  // setting a value the control does not have.
  await Promise.resolve();
  TestBed.tick();

  return fixture;
}

function element(fixture: ComponentFixture<App>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/**
 * Fills in the practice step and presses Continue, landing on the branches step.
 *
 * The plan is a card per plan, built from `listPlans` (T-64 §4), which is why this
 * presses one rather than setting the draft: a test that set the draft directly
 * would pass with the cards wired to nothing.
 */
async function complete(fixture: ComponentFixture<App>): Promise<void> {
  const name = element(fixture).querySelector<HTMLInputElement>('#practice-name')!;

  name.value = 'Cairo Physio';
  name.dispatchEvent(new Event('input'));

  const plans = [
    ...element(fixture).querySelectorAll<HTMLInputElement>('#practice-plan input[type="radio"]'),
  ];

  plans.find((plan) => plan.value === 'STANDARD')!.click();
  TestBed.tick();

  element(fixture).querySelector<HTMLButtonElement>('.primary-button')!.click();
  TestBed.tick();
}

describe('the platform console', () => {
  it('opens onto the practice list', async () => {
    const fixture = await open('/');

    // `/` redirects rather than being the landing screen itself, so the URL a
    // platform administrator sees and shares is the one the wordmark links to.
    // It was `/onboard` until the list route existed, which meant the console's
    // first screen was a form for making something rather than a view of what
    // was already there.
    expect(TestBed.inject(Router).url).toBe('/practices');
    expect(element(fixture).querySelector('main h1')?.textContent).toBe('Practices');
  });

  it('shows all four steps at once, with the first one open', async () => {
    const fixture = await open('/onboard');
    const titles = [...element(fixture).querySelectorAll('.step__title')];

    // The whole shape of the job is on screen from the start. A wizard that shows
    // one step at a time never says what is coming.
    expect(titles.map((title) => title.textContent?.trim())).toEqual([
      'Practice',
      'Branches',
      'Staff',
      'Review and create',
    ]);
    expect(element(fixture).querySelectorAll('.step__panel')).toHaveLength(1);
    expect(element(fixture).querySelector('#practice-name')).not.toBeNull();
  });

  it('will not let a step be opened before the ones above it are finished', async () => {
    const fixture = await open('/onboard');
    const [, branches] = [...element(fixture).querySelectorAll<HTMLElement>('.step__toggle')];

    expect(branches.getAttribute('aria-disabled')).toBe('true');

    branches.click();
    await fixture.whenStable();

    // Still on the practice step: a locked heading is focusable and announced, and
    // pressing it does nothing.
    expect(element(fixture).querySelector('#practice-name')).not.toBeNull();
  });

  it('collapses a finished step to what was entered, and opens the next', async () => {
    const fixture = await open('/onboard');

    await complete(fixture);

    // The practice step is now one ticked line saying what is in it - not gone,
    // and not still open. This is what makes the page assemble as it is filled in.
    expect(element(fixture).querySelector('.step__summary')?.textContent?.trim()).toBe(
      'Cairo Physio · STANDARD',
    );
    expect(element(fixture).querySelector('.step--done')).not.toBeNull();

    // And the branches step is open behind it, with the control that adds one. It is
    // drawn as a plus and named in a `visually-hidden` span, which is why this can
    // still ask for it by name rather than by shape.
    expect(element(fixture).querySelector('.step__panel .add-button')?.textContent).toContain(
      'Add a branch',
    );
  });

  it('reports progress by what is finished, not by where the reader is', async () => {
    const fixture = await open('/onboard');

    expect(element(fixture).querySelector('.progress')?.getAttribute('aria-valuenow')).toBe('0');

    await complete(fixture);

    // One of four, having finished one - the reader is on step 2 and the meter does
    // not claim it.
    expect(element(fixture).querySelector('.progress')?.getAttribute('aria-valuenow')).toBe('1');
    expect(element(fixture).querySelector('.progress__count')?.textContent?.trim()).toBe(
      '1 of 4 done',
    );

    // The segment for the step being worked on is marked as such, and the one
    // behind it as finished. The meter names all four from the start, so the whole
    // job is legible before any of it is done.
    const segments = [...element(fixture).querySelectorAll('.progress__step')];

    expect(segments).toHaveLength(4);
    expect(segments[0].classList).toContain('progress__step--done');
    expect(segments[1].classList).toContain('progress__step--current');
  });

  it('renders the frame around the screen', async () => {
    const fixture = await open('/onboard');

    expect(element(fixture).querySelector('lib-shell')).not.toBeNull();
    expect(element(fixture).querySelector('app-environment-chip')?.textContent).toContain(
      'Production',
    );
  });

  // -------------------------------------------------------------------------
  // An address that matches nothing
  // -------------------------------------------------------------------------

  it('renders Page not found for an unknown address', async () => {
    const fixture = await open('/onboard/nowhere');

    expect(element(fixture).querySelector('main h1')?.textContent).toBe('Page not found');
  });

  it('does not redirect an unknown address', async () => {
    const fixture = await open('/onboard/nowhere');

    // The URL stays wrong on purpose. A silent redirect home turns a broken link
    // into a working one, so the bookmark nobody can open and the typo in a
    // support thread both get reported as "it works for me".
    expect(TestBed.inject(Router).url).toBe('/onboard/nowhere');
    expect(element(fixture).querySelector('main h1')).not.toBeNull();
  });

  it('offers one way out of Page not found', async () => {
    const fixture = await open('/onboard/nowhere');

    expect(
      element(fixture).querySelector<HTMLAnchorElement>('.not-found__link')?.getAttribute('href'),
    ).toBe('/practices');
  });

  it('keeps the frame around Page not found', async () => {
    const fixture = await open('/onboard/nowhere');

    // Including the environment chip: an administrator who mistyped a URL still
    // needs to know which environment they are pointed at.
    expect(element(fixture).querySelector('lib-shell')).not.toBeNull();
    expect(element(fixture).querySelector('app-environment-chip')).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // The browser tab
  // -------------------------------------------------------------------------

  it('names the page, the product and the environment in the browser tab', async () => {
    await open('/onboard', 'staging');

    expect(TestBed.inject(Title).getTitle()).toBe('New practice · EPM Platform · Staging');
  });

  it('names the environment in the tab in production too', async () => {
    await open('/onboard', 'production');

    // A platform administrator with four browser tabs open is reading the tab
    // strip, not the header, and the tab is the last thing between them and
    // creating a practice in the wrong place.
    expect(TestBed.inject(Title).getTitle()).toBe('New practice · EPM Platform · Production');
  });
});

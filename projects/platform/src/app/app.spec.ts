import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { providePlatformAdminSession } from 'core';

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
    ],
  });

  const fixture = TestBed.createComponent(App);
  await TestBed.inject(Router).navigateByUrl(url);
  await fixture.whenStable();

  return fixture;
}

function element(fixture: ComponentFixture<App>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('the platform console', () => {
  it('lands on the practice list', async () => {
    const fixture = await open('/');

    // `/` redirects rather than being the list itself, so that the URL a
    // platform administrator sees and shares is the one the wordmark links to.
    expect(TestBed.inject(Router).url).toBe('/practices');
    expect(element(fixture).querySelector('main h1')?.textContent).toBe('Practices');
  });

  it('renders the empty state, not a table', async () => {
    const fixture = await open('/practices');

    expect(element(fixture).querySelector('.empty-state__headline')?.textContent).toBe(
      'No practices yet',
    );
    expect(element(fixture).querySelector('table')).toBeNull();
  });

  it('renders the frame around the screen', async () => {
    const fixture = await open('/practices');

    expect(element(fixture).querySelector('lib-shell')).not.toBeNull();
    expect(element(fixture).querySelector('app-environment-chip')?.textContent).toContain(
      'Production',
    );
  });

  // -------------------------------------------------------------------------
  // An address that matches nothing
  // -------------------------------------------------------------------------

  it('renders Page not found for an unknown address', async () => {
    const fixture = await open('/practices/nowhere');

    expect(element(fixture).querySelector('main h1')?.textContent).toBe('Page not found');
  });

  it('does not redirect an unknown address', async () => {
    const fixture = await open('/practices/nowhere');

    // The URL stays wrong on purpose. A silent redirect to the list turns a
    // broken link into a working one, so the bookmark nobody can open and the
    // typo in a support thread both get reported as "it works for me".
    expect(TestBed.inject(Router).url).toBe('/practices/nowhere');
    expect(element(fixture).querySelector('main h1')).not.toBeNull();
  });

  it('offers one way out of Page not found', async () => {
    const fixture = await open('/practices/nowhere');

    expect(
      element(fixture).querySelector<HTMLAnchorElement>('.not-found__link')?.getAttribute('href'),
    ).toBe('/practices');
  });

  it('keeps the frame around Page not found', async () => {
    const fixture = await open('/practices/nowhere');

    // Including the environment chip: an administrator who mistyped a URL still
    // needs to know which environment they are pointed at.
    expect(element(fixture).querySelector('lib-shell')).not.toBeNull();
    expect(element(fixture).querySelector('app-environment-chip')).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // The browser tab
  // -------------------------------------------------------------------------

  it('names the page, the product and the environment in the browser tab', async () => {
    await open('/practices', 'staging');

    expect(TestBed.inject(Title).getTitle()).toBe('Practices · EPM Platform · Staging');
  });

  it('names the environment in the tab in production too', async () => {
    await open('/practices', 'production');

    // A platform administrator with four tabs open is reading the tab strip,
    // not the header, and the tab is the last thing between them and creating a
    // practice in the wrong place.
    expect(TestBed.inject(Title).getTitle()).toBe('Practices · EPM Platform · Production');
  });
});

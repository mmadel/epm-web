import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Route, Router, Routes } from '@angular/router';

import { App } from './app';
import { appConfig } from './app.config';
import { routes } from './app.routes';
import { ROUTE_PATHS } from './route-paths';

/**
 * Opens an address in the real application, with the real route table.
 *
 * It mounts {@link App} rather than the routed component on its own, because half
 * of what this ticket owes is that the frame is still there afterwards: the shell,
 * the wordmark and the navigation have to survive a route that matched nothing, and
 * a harness that renders only the outlet's component cannot tell.
 *
 * IT TAKES THE APPLICATION'S OWN PROVIDERS rather than a router assembled here.
 * The route table alone is not the configuration: `withComponentInputBinding` is
 * what carries a route's `data.section` into the screen it opens, and a spec that
 * built its own `provideRouter` would pass with that feature switched off while
 * every heading in the console rendered empty.
 */
async function open(url: string): Promise<{ router: Router; element: HTMLElement }> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [...appConfig.providers] });

  const router = TestBed.inject(Router);
  const fixture: ComponentFixture<App> = TestBed.createComponent(App);

  await router.navigateByUrl(url);
  await fixture.whenStable();

  return { router, element: fixture.nativeElement as HTMLElement };
}

/** Every path in the table, joined, so a nested route is named in full. */
function allPaths(tree: Routes, parent = ''): string[] {
  return tree.flatMap((route: Route) => {
    const path = [parent, route.path].filter((part) => part).join('/');

    return [path, ...allPaths(route.children ?? [], path)];
  });
}

describe('staff routes', () => {
  afterEach(() => {
    // `provideLanguage` is not in this test's providers, but mounting the shell
    // reads the language service, which labels the document. Left behind, the
    // attributes leak into whatever runs next.
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('opens onto the practice section', async () => {
    // `/` renders nothing of its own. It is the address a person types, and the
    // console's home is the practice's own details.
    const { router, element } = await open('/');

    expect(router.url).toBe(ROUTE_PATHS.practice);
    expect(element.querySelector('.placeholder__heading')?.textContent?.trim()).toBe(
      'Practice details',
    );
  });

  it('reaches every section by its own address, and each renders its own name', async () => {
    // Typed directly, not clicked. It is the way a bookmark and a shared link
    // arrive, and it is what proves the routes exist rather than the navigation.

    // EACH SECTION SHOWS ITS OWN NAME even though the four share one placeholder
    // component: the name comes from the route's `data`, so a route wired to the
    // wrong key renders the wrong heading here rather than in front of a user.
    const expected = {
      [ROUTE_PATHS.practice]: 'Practice details',
      [ROUTE_PATHS.clinics]: 'Clinics',
      [ROUTE_PATHS.staff]: 'Staff',
      [ROUTE_PATHS.subscription]: 'Subscription',
    };

    for (const [url, heading] of Object.entries(expected)) {
      const { router, element } = await open(url);

      expect(router.url, url).toBe(url);
      expect(element.querySelector('app-section-placeholder'), url).not.toBeNull();
      expect(element.querySelector('.placeholder__heading')?.textContent?.trim(), url).toBe(
        heading,
      );
    }
  });

  it('marks exactly one tab active, and it is the section that is open', async () => {
    // The active state is derived from the router - T-97 §5 - so this navigates and
    // reads what the frame drew, rather than asking a component what it thinks it is.
    const expected = {
      [ROUTE_PATHS.practice]: ['Practice details'],
      [ROUTE_PATHS.clinics]: ['Clinics'],
      [ROUTE_PATHS.staff]: ['Staff'],
      [ROUTE_PATHS.subscription]: ['Subscription'],

      // Nothing is open, so nothing is marked. A tab marked here would tell the
      // reader they are somewhere they are not.
      '/nonsense': [],
    };

    for (const [url, marked] of Object.entries(expected)) {
      const { element } = await open(url);

      expect(
        [...element.querySelectorAll('.shell-nav__link--active')].map((tab) =>
          tab.textContent?.trim(),
        ),
        url,
      ).toEqual(marked);
    }
  });

  it('renders the unknown-route screen for an address no section matches', async () => {
    const { element } = await open('/nonsense');

    expect(element.querySelector('.placeholder__heading')?.textContent?.trim()).toBe(
      'Page not found',
    );
  });

  it('does not redirect an unmatched address to the practice section', async () => {
    // A silent redirect turns a broken link into a working one, so the bookmark
    // nobody can open gets reported as "it works for me".
    const { router } = await open('/nonsense');

    expect(router.url).toBe('/nonsense');
  });

  it('renders the unknown-route screen inside the shell, with the navigation usable', async () => {
    // THE FAILURE THIS RULES OUT IS A DEAD END. An unmatched address that replaces
    // the whole page leaves a person with no way out but the browser's back button
    // or a reload, and a reload of a single-page application is how a session gets
    // lost.
    const { element } = await open('/nonsense');

    expect(element.querySelector('lib-shell')).not.toBeNull();
    expect(element.querySelector('.wordmark')).not.toBeNull();
    expect(
      [...element.querySelectorAll<HTMLAnchorElement>('.shell-nav__link')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual([
      ROUTE_PATHS.practice,
      ROUTE_PATHS.clinics,
      ROUTE_PATHS.staff,
      ROUTE_PATHS.subscription,
    ]);
  });

  it('offers a way back out of the unknown-route screen', async () => {
    const { element } = await open('/nonsense');

    expect(element.querySelector('.not-found__link')?.getAttribute('href')).toBe(
      ROUTE_PATHS.practice,
    );
  });

  it('has no practice id, and no other tenant identifier, in any path', async () => {
    // `LLD-PRACTICE.md` §1: the practice is the caller's and the backend takes it
    // from the session. A segment for it here would be a way to ask for somebody
    // else's, and the fix for that is not a guard - it is not having the segment.
    //
    // A parameter of ANY name fails this, not just one spelt "practice". The rule
    // is about what a path can address, and `:orgId` addresses exactly as much as
    // `:practiceId` does.
    for (const path of allPaths(routes)) {
      expect(path, `path "${path}"`).not.toMatch(/(^|\/):/);
    }
  });
});

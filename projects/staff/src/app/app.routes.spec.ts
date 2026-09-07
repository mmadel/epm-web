import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Route, Router, Routes } from '@angular/router';
import { provideStubAuth } from 'core';

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
 * IT SIGNS SOMEBODY IN, AND THE STUB HAS TO COME AFTER `appConfig.providers` to
 * do it - the later provider for a token wins. Every route is behind
 * `authenticatedGuard` now, so a harness without this would navigate nowhere and
 * every assertion here would be a test of the guard. What an unauthenticated
 * visit reaches is `auth-routes.spec.ts`, which is where it belongs.
 *
 * IT TAKES THE APPLICATION'S OWN PROVIDERS rather than a router assembled here.
 * The route table alone is not the configuration: `withComponentInputBinding` is
 * what carries a route's `data.section` into the screen it opens, and a spec that
 * built its own `provideRouter` would pass with that feature switched off while
 * every heading in the console rendered empty.
 */
async function open(url: string): Promise<{ router: Router; element: HTMLElement }> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [...appConfig.providers, provideStubAuth()] });

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

  it('opens onto the practice’s own screen', async () => {
    // `/` renders nothing of its own. NOT `/practice`, which is what T-97 §4 and
    // criterion 1 specify: administering the practice is one thing this console does
    // rather than the thing it is, and the landing page was decided after seeing it
    // running. The assertion is here so the departure is a decision on the record
    // rather than a drift somebody finds later.
    const { router, element } = await open('/');

    expect(router.url).toBe(ROUTE_PATHS.home);
    expect(element.querySelector('.practice-home__title')?.textContent?.trim()).toBe(
      'Your practice',
    );
  });

  it('offers a way into every area from the practice’s own screen', async () => {
    // THE LANDING PAGE IS A WAY IN, and this is the whole of what it promises: one
    // card per area, each a link, each reaching a route that exists. The order is
    // asserted with them, because it is the rail's order and a landing page that
    // disagreed with the rail would be teaching two different consoles.
    const { element } = await open('/');

    expect(
      [...element.querySelectorAll<HTMLAnchorElement>('.area')].map((card) => ({
        name: card.querySelector('.area__name')?.textContent?.trim(),
        href: card.getAttribute('href'),
      })),
    ).toEqual([
      { name: 'Practice details', href: ROUTE_PATHS.practice },
      { name: 'Clinics', href: ROUTE_PATHS.clinics },
      { name: 'Staff', href: ROUTE_PATHS.staff },
      { name: 'Subscription', href: ROUTE_PATHS.subscription },
    ]);
  });

  it('says what each area is for, rather than repeating its name', async () => {
    // The reason this screen is not the rail a second time. A card with only a name
    // on it is a link the navigation already offers, in a bigger box.
    const { element } = await open('/');

    for (const card of element.querySelectorAll('.area')) {
      const summary = card.querySelector('.area__summary')?.textContent?.trim() ?? '';
      const name = card.querySelector('.area__name')?.textContent?.trim() ?? '';

      expect(summary.length, name).toBeGreaterThan(name.length);
    }
  });

  it('reaches every area by its own address, and each renders its own name', async () => {
    // Typed directly, not clicked. It is the way a bookmark and a shared link
    // arrive, and it is what proves the routes exist rather than the navigation.

    // EACH SECTION SHOWS ITS OWN NAME even though the four share one placeholder
    // component: the name comes from the route's `data`, so a route wired to the
    // wrong key renders the wrong heading here rather than in front of a user.
    const expected = {
      [ROUTE_PATHS.practice]: ['Practice details', 'app-practice-section'],
      [ROUTE_PATHS.clinics]: ['Clinics', 'app-clinics-section'],
      [ROUTE_PATHS.staff]: ['Staff', 'app-staff-section'],
      [ROUTE_PATHS.subscription]: ['Subscription', 'app-subscription-section'],
    };

    for (const [url, [heading, selector]] of Object.entries(expected)) {
      const { router, element } = await open(url);

      expect(router.url, url).toBe(url);
      expect(element.querySelector('.placeholder__heading')?.textContent?.trim(), url).toBe(
        heading,
      );
      // Its OWN component, not a shared one wearing its name. The four are separate
      // files so that each owning ticket can fill one without touching the others.
      expect(element.querySelector(selector), url).not.toBeNull();
    }
  });

  it('swaps the content region without reloading the page', async () => {
    // Criterion 5, and the reason it is worth asserting: a section is fetched on
    // demand now, so "the screen changed" and "the application restarted" look the
    // same to a person watching. The frame surviving the navigation is what tells
    // them apart, and `App` is only constructed once here.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideStubAuth()] });

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    const wordmark = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.wordmark__product');

    await router.navigateByUrl(ROUTE_PATHS.clinics);
    await fixture.whenStable();
    const before = wordmark();

    await router.navigateByUrl(ROUTE_PATHS.staff);
    await fixture.whenStable();

    // THE SAME ELEMENT, not merely one that looks the same. A reload would have
    // built a new one.
    expect(wordmark()).toBe(before);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-staff-section'),
    ).not.toBeNull();
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

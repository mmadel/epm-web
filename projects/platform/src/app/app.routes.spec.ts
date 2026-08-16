import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { inject as injectFn } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, Routes } from '@angular/router';
import { BASE_PATH } from 'api-client';
import { API_BASE_URL, provideApiBaseUrl, providePlatformAdminSession } from 'core';

import { routes } from './app.routes';
import { platformAdminGuard } from './session/platform-admin-guard';

/** Whether a guard list names {@link platformAdminGuard}. */
function declaresGuard(guards: readonly unknown[] | undefined): boolean {
  return Array.isArray(guards) && guards.includes(platformAdminGuard);
}

function join(parent: string, segment: string | undefined): string {
  return [parent, segment].filter((part) => part).join('/');
}

/**
 * Walks the route tree and returns the paths that nothing guards.
 *
 * A route counts as covered when it declares the guard itself, or when an
 * ancestor declared it as `canActivateChild` - the two ways of actually getting
 * it to run. Redirects are exempt: they activate nothing, so there is nothing to
 * protect, and the route they land on is checked on its own.
 *
 * A `loadChildren` boundary is opaque from here. That is not a hole: the route
 * declaring `loadChildren` is itself walked, so a lazy feature is only reachable
 * through a route this test has already required a guard on.
 */
function unguardedPaths(tree: Routes, parent = '', inherited = false): string[] {
  return tree.flatMap((route: Route) => {
    const path = join(parent, route.path) || '/';
    const covered = inherited || declaresGuard(route.canActivate) || declaresGuard(route.canMatch);
    const self = covered || route.redirectTo !== undefined ? [] : [path];

    return [
      ...self,
      ...unguardedPaths(
        route.children ?? [],
        path === '/' ? '' : path,
        covered || declaresGuard(route.canActivateChild),
      ),
    ];
  });
}

/**
 * Where the real route table sends a URL.
 *
 * It navigates rather than reading the table, because the two things worth
 * asserting here - that `/` lands on the list, and that an address inside the
 * feature's empty-path boundary which matches no screen still reaches the wildcard -
 * are both facts about the router's matching rather than about the array.
 */
async function landsOn(url: string): Promise<{ url: string; title: string | undefined }> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      providePlatformAdminSession(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
    ],
  });

  const router = TestBed.inject(Router);

  await router.navigateByUrl(url);

  // The screen is the deepest activated route, not the first child: the feature
  // sits under an empty-path boundary, so the child of the root carries the guard
  // and the one below it carries the title.
  let deepest = router.routerState.snapshot.root;

  while (deepest.firstChild !== null) {
    deepest = deepest.firstChild;
  }

  return { url: router.url, title: deepest.title };
}

describe('platform routes', () => {
  it('puts every route behind platformAdminGuard', () => {
    // Vacuously true while there are no routes, and that is the point of writing
    // it now: the shell and the two screens land in later tickets, and this goes
    // red the moment one of them adds a route nobody guarded. A comment saying
    // "remember the guard" is a comment somebody does not read on the third
    // route; this is checked on every push.
    expect(unguardedPaths(routes)).toEqual([]);
  });

  it('opens onto the practice list', async () => {
    // The console's home. It was `/onboard` while the list route did not exist,
    // which meant the way to find out whether a practice was already there was to
    // create a second one.
    expect(await landsOn('/')).toEqual({ url: '/practices', title: 'Practices' });
  });

  it('reaches one practice, which is a row in the list opened', async () => {
    // The title is the constant the browser tab reads. The heading on the screen is
    // the practice's name, which a route cannot know before the call that fetches
    // it - see the note on `PracticePage`.
    expect(await landsOn('/practices/org-1')).toEqual({
      url: '/practices/org-1',
      title: 'Practice',
    });
  });

  it('reaches the form that would edit a practice', async () => {
    // It does not save yet - the API routes exist as of the 0.2.0 specification,
    // but this screen is not wired to them - and the screen says so. The form, its
    // rules and its states were built and tested ahead of the wiring.
    expect(await landsOn('/practices/org-1/edit')).toEqual({
      url: '/practices/org-1/edit',
      title: 'Edit practice',
    });
  });

  it('reaches onboarding, which is a task opened from the list', async () => {
    expect(await landsOn('/onboard')).toEqual({ url: '/onboard', title: 'New practice' });
  });

  it('renders "Page not found" for an address no screen matches', async () => {
    // THE ROUTER HAS TO BACKTRACK OUT OF THE FEATURE'S EMPTY-PATH BOUNDARY to get
    // here: `/nonsense` enters it, matches neither screen inside, and must fall
    // through to the wildcard beside it. Asserted rather than assumed, because
    // getting it wrong renders a blank frame with no message on it.
    expect(await landsOn('/nonsense')).toEqual({ url: '/nonsense', title: 'Page not found' });
  });

  it('does not redirect a broken address to the list', async () => {
    // A silent redirect turns a broken link into a working one, so the bookmark
    // nobody can open gets reported as "it works for me".
    expect((await landsOn('/practices/typo')).url).toBe('/practices/typo');
  });
});

describe('unguardedPaths', () => {
  // The check above is only worth having if it can fail, and while `routes` is
  // empty nothing else demonstrates that. These exercise the walker directly.
  const guarded = { path: 'a', canActivate: [platformAdminGuard] };

  it('reports a route with no guard', () => {
    expect(unguardedPaths([{ path: 'a' }])).toEqual(['a']);
  });

  it('accepts a route guarded by canActivate', () => {
    expect(unguardedPaths([guarded])).toEqual([]);
  });

  it('accepts a route guarded by canMatch', () => {
    expect(unguardedPaths([{ path: 'a', canMatch: [platformAdminGuard] }])).toEqual([]);
  });

  it('rejects a route guarded by some other guard', () => {
    expect(unguardedPaths([{ path: 'a', canActivate: [() => true] }])).toEqual(['a']);
  });

  it('reports an unguarded child of an unguarded parent', () => {
    expect(unguardedPaths([{ path: 'a', children: [{ path: 'b' }] }])).toEqual(['a', 'a/b']);
  });

  it('covers children through a guarded parent', () => {
    expect(unguardedPaths([{ ...guarded, children: [{ path: 'b' }, { path: 'c' }] }])).toEqual([]);
  });

  it('reports a parent that guards only its children', () => {
    // `canActivateChild` does not run for the parent's own activation, so a
    // route carrying nothing else is still reachable unguarded. Its children are
    // covered; the parent is not.
    expect(
      unguardedPaths([
        { path: 'a', canActivateChild: [platformAdminGuard], children: [{ path: 'b' }] },
      ]),
    ).toEqual(['a']);
  });

  it('exempts a redirect', () => {
    expect(unguardedPaths([{ path: '', redirectTo: 'a', pathMatch: 'full' }])).toEqual([]);
  });

  it('requires a guard on a lazy boundary', () => {
    expect(unguardedPaths([{ path: 'a', loadChildren: () => [] }])).toEqual(['a']);
  });

  it('names a nested path in full', () => {
    expect(
      unguardedPaths([{ path: 'a', children: [{ path: 'b', children: [{ path: 'c' }] }] }]),
    ).toEqual(['a', 'a/b', 'a/b/c']);
  });
});

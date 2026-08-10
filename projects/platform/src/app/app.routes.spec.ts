import { Route, Routes } from '@angular/router';

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

describe('platform routes', () => {
  it('puts every route behind platformAdminGuard', () => {
    // Vacuously true while there are no routes, and that is the point of writing
    // it now: the shell and the two screens land in later tickets, and this goes
    // red the moment one of them adds a route nobody guarded. A comment saying
    // "remember the guard" is a comment somebody does not read on the third
    // route; this is checked on every push.
    expect(unguardedPaths(routes)).toEqual([]);
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

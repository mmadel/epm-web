import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { platformAdminGuard } from './session/platform-admin-guard';

/**
 * Every route in this console is behind `platformAdminGuard`.
 *
 * `app.routes.spec.ts` walks whatever ends up here and fails if a route is added
 * without the guard, so the requirement is enforced by the build rather than by
 * this comment. Redirects are exempt there: they activate nothing, and the route
 * they land on is checked on its own.
 */
export const routes: Routes = [
  {
    // THE CONSOLE OPENS ONTO THE PRACTICE LIST. It is the first question a platform
    // administrator has - what is already here - and until the list route existed
    // the console could not answer it, so `/` opened the form that creates a
    // practice and the way to find out whether one existed was to make a second one.
    path: '',
    pathMatch: 'full',
    redirectTo: 'practices',
  },
  {
    // ONE GUARDED BOUNDARY FOR THE WHOLE FEATURE, rather than the guard being
    // repeated on each of its screens. The feature's own route file declares the
    // two paths; this declares who may reach either of them, and a third screen
    // added inside it cannot arrive unguarded. `canActivate` and not
    // `canActivateChild`: the empty-path parent is activated itself, and
    // `app.routes.spec.ts` reports a route that guards only its children.
    path: '',
    canActivate: [platformAdminGuard],
    // Lazy, and the only kind of reference this file carries to a feature. The
    // guard sits on the boundary rather than inside the feature's own route
    // file, so a feature cannot be reached by a caller nobody checked even if
    // its route file forgets.
    loadChildren: () =>
      import('./features/organizations/organizations.routes').then((m) => m.routes),
  },
  {
    // NOT a redirect to the list. A silent redirect turns a broken link into a
    // working one, so the bookmark nobody can open gets reported as "it works
    // for me". The frame renders with a title that says what happened.
    //
    // It is reached by the router backtracking out of the empty-path boundary
    // above when no screen inside it matches, which `app.routes.spec.ts` asserts
    // by navigating rather than by assuming.
    path: '**',
    canActivate: [platformAdminGuard],
    title: 'Page not found',
    component: NotFoundPage,
  },
];

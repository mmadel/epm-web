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
    path: '',
    pathMatch: 'full',
    redirectTo: 'practices',
  },
  {
    path: 'practices',
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
    path: '**',
    canActivate: [platformAdminGuard],
    title: 'Page not found',
    component: NotFoundPage,
  },
];

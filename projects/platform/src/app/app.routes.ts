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
    // THE CONSOLE OPENS ONTO ITS ONE SCREEN. There is no landing page: the one
    // thing this console does is create a practice with its branches, and a home
    // page whose only content was a button to start doing that was a screen to get
    // past rather than a screen to use. The practice list takes this redirect back
    // when P-04 has a route to stand on.
    path: '',
    pathMatch: 'full',
    redirectTo: 'onboard',
  },
  {
    path: 'onboard',
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

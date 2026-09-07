import { Routes } from '@angular/router';
import { authenticatedGuard } from 'core';

import { NotFoundPage } from './layout/not-found-page';
import { PracticeHome } from './sections/practice-home';

/**
 * The console's route table.
 *
 * EVERY ROUTE IS BEHIND `authenticatedGuard`, INCLUDING THE UNKNOWN-ADDRESS ONE.
 * T-111 §4: an unauthenticated visit never renders a shell, and "Page not found"
 * is a screen inside the shell like any other - a console that let a stranger
 * reach it would be telling them which addresses do not exist, which is a small
 * leak of the shape of the product and a large inconsistency. `app.routes.spec.ts`
 * walks whatever ends up here and fails if a route is added without the guard.
 *
 * IT IS `core`'s GUARD AND NOT THIS CONSOLE'S. Staff has no actor question to ask
 * yet - there is no staff session, because an organization id cannot come from a
 * token (§I9) - so the only question is whether anybody is signed in, and that is
 * the same question in both consoles. The platform console composes a second one
 * on top of it; this one does not have a second one to ask.
 *
 * THERE IS NO PRACTICE ID IN ANY PATH, and none is coming. The practice is the
 * caller's, and the backend takes it from the session; a segment for it here would
 * be a way to ask for somebody else's (`LLD-PRACTICE.md` §1).
 *
 * NO TITLES YET. Angular's title strategy takes a resolved string per route, and
 * this console is bilingual with the language switched at runtime, so a title in the
 * route table would be the one piece of the product that stays English after a
 * switch. It is a strategy that reads the language service, and it belongs with the
 * ticket that needs it rather than half-built here.
 *
 * EVERY SECTION IS `loadComponent` AND NOT `component`, and that is the one thing in
 * this file a passing test suite can hide: four eager imports render every screen
 * correctly and produce one bundle. What checks it is the build output - see
 * `tools/sections/check-lazy-chunks.mjs`, which runs after every `npm run build` and
 * fails if a section's code is in the initial bundle.
 *
 * The home screen is NOT lazy. It is what `/` renders, so deferring it would buy a
 * second request before the first paint in exchange for splitting out a screen every
 * visit needs. Neither is the unknown-route screen, which has to be able to render
 * when something has already gone wrong.
 */
export const routes: Routes = [
  {
    // THE CONSOLE'S ROOT IS ITS HOME SCREEN, rather than an address that redirects
    // to one. A redirect would give this screen a second name - `/` and `/home` for
    // the same thing - and there is nothing for the second one to be: `/practice` is
    // an area of it, and every other name would be a word invented to fill a slot.

    // It is not `/practice`, which is what T-97 §4 and criterion 1 specify. That was
    // written before the console had a screen of its own to land on; administering
    // the practice is one thing this console does rather than the thing it is.
    path: '',
    pathMatch: 'full',
    canActivate: [authenticatedGuard],
    component: PracticeHome,
  },
  {
    // The literals, without their leading slash, are what the router matches; the
    // constants in `route-paths.ts` are what everything that LINKS here uses. This
    // file names none of them - it declares addresses rather than following them -
    // and what ties the two together is the spec beside it, which navigates to every
    // constant and asserts it resolves.
    path: 'practice',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./sections/practice-section').then((m) => m.PracticeSection),
  },
  {
    path: 'clinics',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./sections/clinics-section').then((m) => m.ClinicsSection),
  },
  {
    path: 'staff',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./sections/staff-section').then((m) => m.StaffSection),
  },
  {
    path: 'subscription',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./sections/subscription-section').then((m) => m.SubscriptionSection),
  },
  {
    // NOT a redirect to the home screen - see `NotFoundPage`. It is last because the
    // router matches in order, and it renders under the same outlet as every section,
    // so the frame stays on the screen.
    path: '**',
    canActivate: [authenticatedGuard],
    component: NotFoundPage,
  },
];

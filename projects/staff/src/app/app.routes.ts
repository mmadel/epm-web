import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { PracticeHome } from './sections/practice-home';

/**
 * The console's route table.
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
    component: PracticeHome,
  },
  {
    // The literals, without their leading slash, are what the router matches; the
    // constants in `route-paths.ts` are what everything that LINKS here uses. This
    // file names none of them - it declares addresses rather than following them -
    // and what ties the two together is the spec beside it, which navigates to every
    // constant and asserts it resolves.
    path: 'practice',
    loadComponent: () => import('./sections/practice-section').then((m) => m.PracticeSection),
  },
  {
    path: 'clinics',
    loadComponent: () => import('./sections/clinics-section').then((m) => m.ClinicsSection),
  },
  {
    path: 'staff',
    loadComponent: () => import('./sections/staff-section').then((m) => m.StaffSection),
  },
  {
    path: 'subscription',
    loadComponent: () =>
      import('./sections/subscription-section').then((m) => m.SubscriptionSection),
  },
  {
    // NOT a redirect to the home screen - see `NotFoundPage`. It is last because the
    // router matches in order, and it renders under the same outlet as every section,
    // so the frame stays on the screen.
    path: '**',
    component: NotFoundPage,
  },
];

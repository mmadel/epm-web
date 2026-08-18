import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { ROUTE_PATHS } from './route-paths';
import { PracticeSection } from './sections/practice-section';

/**
 * The console's route table.
 *
 * THERE IS NO PRACTICE ID IN ANY PATH, and none is coming. The practice is the
 * caller's, and the backend takes it from the session; a segment for it here
 * would be a way to ask for somebody else's (`LLD-PRACTICE.md` §1).
 *
 * NO TITLES YET. Angular's title strategy takes a resolved string per route, and
 * this console is bilingual with the language switched at runtime, so a title in
 * the route table would be the one piece of the product that stays English after
 * a switch. It is a strategy that reads the language service, and it belongs with
 * the ticket that needs it rather than half-built here.
 *
 * The three remaining sections and their own components are T-97c; every path
 * other than `/practice` reaches the screen at the bottom of this file until
 * then.
 */
export const routes: Routes = [
  {
    // The console opens onto the practice's own details. It answers the first
    // question an org admin has - what is this practice, as the system holds it -
    // and every other section is a part of it.
    path: '',
    pathMatch: 'full',
    redirectTo: ROUTE_PATHS.practice,
  },
  {
    // The literal, without its leading slash, is what the router matches; the
    // constant in `route-paths.ts` is what everything that LINKS here uses. The
    // spec beside this file navigates to the constant and asserts it resolves,
    // which is what ties the two together.
    path: 'practice',
    component: PracticeSection,
  },
  {
    // NOT a redirect to the practice section - see `NotFoundPage`. It is last
    // because the router matches in order, and it renders under the same outlet
    // as every section, so the frame and the navigation stay on the screen.
    path: '**',
    component: NotFoundPage,
  },
];

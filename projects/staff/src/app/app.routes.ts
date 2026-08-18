import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { ROUTE_PATHS } from './route-paths';
import { SectionPlaceholder } from './sections/section-placeholder';

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
 * `data.section` NAMES THE SECTION, and it is a translation key rather than a
 * word: it reaches `SectionPlaceholder`'s input through
 * `withComponentInputBinding` and is resolved in the active language there. The
 * navigation reads the same key for the same section, so the tab and the heading
 * are one name.
 *
 * EVERY SECTION IS ITS OWN COMPONENT, LOADED LAZILY, IN T-97c. Today the four
 * share one placeholder: this sub-task owes a navigation that is reachable by
 * clicking, and four eagerly imported components would satisfy that while quietly
 * failing criterion 4, which only the build output can see.
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
    // The literals, without their leading slash, are what the router matches; the
    // constants in `route-paths.ts` are what everything that LINKS here uses. The
    // spec beside this file navigates to each constant and asserts it resolves,
    // which is what ties the two together.
    path: 'practice',
    component: SectionPlaceholder,
    data: { section: 'shell.section.practice' },
  },
  {
    path: 'clinics',
    component: SectionPlaceholder,
    data: { section: 'shell.section.clinics' },
  },
  {
    path: 'staff',
    component: SectionPlaceholder,
    data: { section: 'shell.section.staff' },
  },
  {
    path: 'subscription',
    component: SectionPlaceholder,
    data: { section: 'shell.section.subscription' },
  },
  {
    // NOT a redirect to the practice section - see `NotFoundPage`. It is last
    // because the router matches in order, and it renders under the same outlet
    // as every section, so the frame and the navigation stay on the screen.
    path: '**',
    component: NotFoundPage,
  },
];

import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { Home } from './sections/home';
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
    // THE CONSOLE OPENS ONTO THE HOME SCREEN, not onto the practice's details, which
    // is what T-97 §4 and criterion 1 say. Administering the practice is one thing
    // this console does rather than the thing it is, and a front door that opens
    // straight onto a settings screen says otherwise. The ticket records what was
    // asked for; this records what was decided after seeing it running.
    path: '',
    pathMatch: 'full',
    redirectTo: ROUTE_PATHS.home,
  },
  {
    // Its own component from the start, rather than the placeholder the four
    // practice areas share: the home screen is the console's front door and not a
    // face of the practice's record, so T-97c's split does not include it.
    path: 'home',
    component: Home,
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

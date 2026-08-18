import { Routes } from '@angular/router';

import { NotFoundPage } from './layout/not-found-page';
import { PracticeHome } from './sections/practice-home';
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

import { Routes } from '@angular/router';

import { OnboardPractice } from './pages/onboard-practice/onboard-practice';
import { PracticeEdit } from './pages/practice-edit/practice-edit';
import { PracticePage } from './pages/practice/practice-page';
import { PracticeList } from './pages/practice-list/practice-list';

/**
 * The console's two screens: the practices there are, and creating one.
 *
 * THE FOLDER IS `organizations` AND THE URLS SAY PRACTICE, deliberately. The
 * folder follows the milestone's structure and the API's noun
 * (`GET`/`POST /api/v1/platform/organizations`); the URLs and every word on screen
 * follow the product's vocabulary, which says practice, never organization.
 *
 * THE LIST IS FIRST BECAUSE IT IS THE LANDING SCREEN. `/` redirects to it (see
 * `app.routes.ts`), and onboarding is a task opened from it - which is the shape
 * F1 §5 described for the day the list route existed, and it does now:
 * `listOrganizations` is in the generated client (`LLD-ORGANIZATION.md` §2.8).
 *
 * BOTH ROUTES ARE IN ONE FILE, and one lazy chunk, because they are one feature:
 * they read the same noun from the same API and share the vocabulary that words it.
 * A reader who lands on the list is very likely to open onboarding next, so the
 * second screen arriving with the first is a load nobody waits for twice.
 *
 * The title here is the single source for both the browser tab and the `h1`:
 * `PlatformTitleStrategy` composes the tab from it and `PageHeader` reads the same
 * value, so the two cannot drift.
 */
export const routes: Routes = [
  {
    path: 'practices',
    title: 'Practices',
    component: PracticeList,
  },
  {
    // ONE PRACTICE, opened from a row in the list above. The title is the constant
    // the browser tab reads; the heading on the screen is the practice's name,
    // which a route cannot know before the call that fetches it - see the note on
    // `PracticePage` for why this is the one screen that does not use `PageHeader`.
    path: 'practices/:id',
    title: 'Practice',
    component: PracticePage,
  },
  {
    // EDITING ONE - which no route in the platform API can actually complete. The
    // screen reads a practice, fills a form in and validates it; its submit is
    // disabled and says why. See `PracticeEdit` for the whole argument, and F1 §7
    // item 1e for who owns the route it is waiting on.
    path: 'practices/:id/edit',
    title: 'Edit practice',
    component: PracticeEdit,
  },
  {
    path: 'onboard',
    title: 'New practice',
    component: OnboardPractice,
  },
];

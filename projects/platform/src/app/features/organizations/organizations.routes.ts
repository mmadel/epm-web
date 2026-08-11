import { Routes } from '@angular/router';

import { OnboardPractice } from './pages/onboard-practice/onboard-practice';

/**
 * One route, because the console is one screen.
 *
 * THE FOLDER IS `organizations` AND THE URL SAYS PRACTICE, deliberately. The
 * folder follows the milestone's structure and the API's noun
 * (`POST /api/v1/platform/organizations`); the URL and every word on screen follow
 * the product's vocabulary, which says practice, never organization.
 *
 * There were briefly four routes here - a stage each for the practice, its
 * branches, its staff and a review - and they were removed as machinery around a
 * form that fits on one screen. `pages/` keeps its shape for when there is a
 * second screen; the practice list (P-04) is the one waiting on a route to exist.
 *
 * The title here is the single source for both the browser tab and the `h1`:
 * `PlatformTitleStrategy` composes the tab from it and `PageHeader` reads the same
 * value, so the two cannot drift.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'New practice',
    component: OnboardPractice,
  },
];

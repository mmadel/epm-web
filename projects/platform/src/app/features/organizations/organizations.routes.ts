import { Routes } from '@angular/router';

import { PracticeList } from './pages/practice-list/practice-list';

/**
 * The practices feature.
 *
 * THE FOLDER IS `organizations` AND THE URL IS `practices`, deliberately. The
 * folder follows the milestone's structure and the API's noun
 * (`POST /api/v1/platform/organizations`); the URL and every word on screen
 * follow the product's vocabulary, which says practice, never organization. A
 * URL is something a platform administrator reads.
 *
 * The titles here are the single source for both the browser tab and the `h1`:
 * `PlatformTitleStrategy` composes the tab from them and `PageHeader` reads the
 * same value, so the two cannot drift.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Practices',
    component: PracticeList,
  },
];

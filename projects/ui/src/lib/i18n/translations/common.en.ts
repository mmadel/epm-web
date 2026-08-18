/**
 * English strings for the `common` area: wording reused across features and owned
 * by none of them.
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const commonEn = {
  'common.action.save': 'Save',
  'common.action.cancel': 'Cancel',
  'common.action.close': 'Close',
  'common.action.retry': 'Try again',
  'common.action.search': 'Search',

  'common.state.loading': 'Loading',
  'common.state.empty': 'Nothing to show',
  'common.state.error': 'Something went wrong',
  'common.state.not-built': 'This part of the console has not been built yet.',
};

/** Every key this area defines. `common.ar.ts` must define exactly these. */
export type CommonKey = keyof typeof commonEn;

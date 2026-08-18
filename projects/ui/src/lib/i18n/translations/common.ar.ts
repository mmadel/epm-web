import { CommonKey } from './common.en';

/**
 * PLACEHOLDER - THESE VALUES ARE ENGLISH, NOT ARABIC.
 *
 * Nothing in this file has been translated. Clinical Arabic needs a clinician's
 * sign-off and that clinician has not been identified yet, so the gap is left
 * visible rather than filled with machine translation that would read as finished
 * work. See ./README.md before changing anything here.
 *
 * The type annotation is the point of this file being TypeScript: it fails the
 * build if a key here is missing or misspelt relative to `common.en.ts`.
 */
export const commonAr: Record<CommonKey, string> = {
  'common.action.save': 'Save',
  'common.action.cancel': 'Cancel',
  'common.action.close': 'Close',
  'common.action.retry': 'Try again',
  'common.action.search': 'Search',

  'common.state.loading': 'Loading',
  'common.state.empty': 'Nothing to show',
  'common.state.error': 'Something went wrong',
  'common.state.loading-section': 'This part of the console is being fetched.',
  'common.state.not-built': 'This part of the console has not been built yet.',
};

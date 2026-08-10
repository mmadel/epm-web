import { ShellKey } from './shell.en';

/**
 * PLACEHOLDER - THESE VALUES ARE ENGLISH, NOT ARABIC.
 *
 * Nothing in this file has been translated. Clinical Arabic needs a clinician's
 * sign-off and that clinician has not been identified yet, so the gap is left
 * visible rather than filled with machine translation that would read as finished
 * work. See ./README.md before changing anything here.
 *
 * Note in particular that `shell.language.arabic` reads "Arabic": the name of a
 * language is normally shown in that language, so this one is a placeholder too.
 *
 * The type annotation is the point of this file being TypeScript: it fails the
 * build if a key here is missing or misspelt relative to `shell.en.ts`.
 */
export const shellAr: Record<ShellKey, string> = {
  'shell.header.title': 'Elite Physical Medicine',
  'shell.header.skip-to-content': 'Skip to main content',

  'shell.nav.label': 'Main navigation',
  'shell.nav.dashboard': 'Dashboard',
  'shell.nav.patients': 'Patients',
  'shell.nav.appointments': 'Appointments',
  'shell.nav.billing': 'Billing',

  'shell.language.label': 'Language',
  'shell.language.english': 'English',
  'shell.language.arabic': 'Arabic',

  'shell.account.label': 'Account',
  'shell.account.sign-out': 'Sign out',
};

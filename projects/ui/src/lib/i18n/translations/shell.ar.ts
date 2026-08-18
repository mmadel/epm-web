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
  'shell.header.title': 'EPM',
  'shell.header.console': 'Staff',
  'shell.header.skip-to-content': 'Skip to main content',

  'shell.nav.label': 'Main navigation',

  'shell.section.dashboard': 'Dashboard',
  'shell.section.practice': 'Practice details',
  'shell.section.clinics': 'Clinics',
  'shell.section.staff': 'Staff',
  'shell.section.subscription': 'Subscription',

  'shell.summary.practice':
    'The name, contact details and registration this practice trades under.',
  'shell.summary.clinics': 'The places this practice works from, and how to reach each one.',
  'shell.summary.staff':
    'Who works here, what they may do, and who has yet to accept an invitation.',
  'shell.summary.subscription':
    'The plan this practice is on, what it includes, and when it renews.',

  'shell.dashboard.lead': 'Everything you run for this practice, in one place.',

  'shell.not-found.title': 'Page not found',
  'shell.not-found.body':
    'That address does not match a screen in this console. It may have been mistyped, or it may point at something that has not been built yet.',
  'shell.not-found.link': 'Go to practice details',

  'shell.language.label': 'Language',
  'shell.language.english': 'English',
  'shell.language.arabic': 'Arabic',

  'shell.account.label': 'Account',
  'shell.account.sign-out': 'Sign out',
};

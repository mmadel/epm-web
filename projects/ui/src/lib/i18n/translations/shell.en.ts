/**
 * English strings for the `shell` area: the application frame - header,
 * navigation and the language switch.
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const shellEn = {
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

/** Every key this area defines. `shell.ar.ts` must define exactly these. */
export type ShellKey = keyof typeof shellEn;

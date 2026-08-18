/**
 * English strings for the `shell` area: the application frame - header,
 * navigation and the language switch.
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const shellEn = {
  'shell.header.title': 'EPM',
  // WHICH CONSOLE THIS IS, shown beside the product's name. The staff console is
  // the only application mounting a translated frame today; a second one adds its
  // own key beside this rather than reusing it, because "Staff" is a name and not
  // a role the frame fills in.
  'shell.header.console': 'Staff',
  'shell.header.skip-to-content': 'Skip to main content',

  'shell.nav.label': 'Main navigation',

  // The console's sections. One key each, read twice - by the navigation entry
  // that reaches a section and by the section's own heading - because they are
  // one name. Two keys would be two names the moment one of them was reworded.
  'shell.section.practice': 'Practice details',

  // What an address that matches no screen renders.
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

/** Every key this area defines. `shell.ar.ts` must define exactly these. */
export type ShellKey = keyof typeof shellEn;

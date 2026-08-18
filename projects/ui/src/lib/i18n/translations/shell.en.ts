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

  // The console's areas, in the order the navigation shows them. One key each, read
  // twice - by the rail entry that reaches an area and by that area's own heading -
  // because they are one name. Two keys would be two names the moment one of them
  // was reworded.

  // THE ORDER IS WHERE YOU LAND, THEN CONTAINMENT: the home screen is the front door,
  // and after it a practice has clinics, clinics have staff, and all of it sits
  // under one subscription. Not alphabetical, and not by how often each is opened.
  'shell.section.home': 'Home',
  'shell.section.practice': 'Practice details',
  'shell.section.clinics': 'Clinics',
  'shell.section.staff': 'Staff',
  'shell.section.subscription': 'Subscription',

  // WHAT IS INSIDE EACH AREA, one line each, for the cards on the landing page.
  // They are the only place in the console that says what a section is FOR rather
  // than what it is called, which is what a person opening this product for the
  // first time actually needs.
  'shell.summary.practice':
    'The name, contact details and registration this practice trades under.',
  'shell.summary.clinics': 'The places this practice works from, and how to reach each one.',
  'shell.summary.staff':
    'Who works here, what they may do, and who has yet to accept an invitation.',
  'shell.summary.subscription':
    'The plan this practice is on, what it includes, and when it renews.',

  // The landing page's own words.
  'shell.home.lead': 'Everything you run for this practice, in one place.',

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

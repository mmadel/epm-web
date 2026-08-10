/**
 * English strings for the `shell` area: the application frame - header,
 * navigation and the language switch.
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const shellEn = {
  'shell.header.title': 'Elite Physical Medicine',
  'shell.language.label': 'Language',
};

/** Every key this area defines. `shell.ar.ts` must define exactly these. */
export type ShellKey = keyof typeof shellEn;

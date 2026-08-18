/**
 * Every path in this console, in one place.
 *
 * They live here rather than beside the screen that each one opens, because the
 * things that link to a screen are mostly not inside it: the wordmark in the
 * header is the route home, the navigation reaches every section, and the screen
 * an unmatched address renders offers a way out. A section importing the layout,
 * or the layout importing a section, would be a dependency in the wrong direction
 * for the sake of a string.
 *
 * NO PRACTICE ID APPEARS IN ANY OF THEM, and that is a rule rather than an
 * omission (`LLD-PRACTICE.md` §1). The practice is the caller's, taken from the
 * session by the backend; a practice id in a path is an invitation to type a
 * different one, which is the whole shape of the mistake this console must not
 * make. The same goes for any other tenant identifier.
 */
export const ROUTE_PATHS = {
  /**
   * The console's home: the practice's own details.
   *
   * `/` redirects here rather than rendering anything of its own. It is the first
   * question an org admin has - what is this practice, as the system holds it -
   * and it is the section every other one is a part of.
   */
  practice: '/practice',
} as const;

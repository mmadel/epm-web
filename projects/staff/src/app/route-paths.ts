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
 *
 * THE ORDER BELOW IS THE ORDER THE NAVIGATION SHOWS: where you land, and then
 * containment - a practice has clinics, clinics have staff, and all of it sits
 * under one subscription. Not alphabetical, and not by how often each is opened.
 */
export const ROUTE_PATHS = {
  /**
   * Where a signed-in staff member lands, and where `/` sends them.
   *
   * IT IS NOT `/practice`, which is what T-97 §4 and criterion 1 specify. The
   * home screen was decided after seeing the console running: administering the
   * practice is one thing this console does rather than the thing it is, and a
   * front door that opens straight onto a settings screen says otherwise.
   */
  home: '/home',

  /**
   * The practice's own details.
   *
   * The first question an org admin has - what is this practice, as the system
   * holds it - and the area the three below are parts of.
   */
  practice: '/practice',

  /**
   * The practice's branches.
   *
   * THE PATH SAYS CLINICS AND THE PRODUCT SAYS CLINICS. `T-66` is filed against
   * "branches", which is the word the API and the milestone use; a URL is
   * something a practice manager reads, and what they have is clinics.
   */
  clinics: '/clinics',

  /** The people who work in them. */
  staff: '/staff',

  /** What the practice pays for, and what that entitles it to. */
  subscription: '/subscription',
} as const;

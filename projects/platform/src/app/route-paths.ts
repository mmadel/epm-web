/**
 * Every path in this console, in one place.
 *
 * They live here rather than in the feature that owns the screen because the
 * things that link to a screen are not always inside it: the wordmark in the
 * header is the route home, and "Page not found" offers a way back. A feature
 * importing the layout, or the layout importing a feature, would be a dependency
 * in the wrong direction for the sake of a string.
 *
 * THE URLS SAY PRACTICE. The folder that implements them is `organizations`,
 * following the milestone's structure and the API's noun, but a URL is something
 * a platform administrator reads, and the product's vocabulary says practice.
 */
export const ROUTE_PATHS = {
  /**
   * The console's home: every practice on the platform.
   *
   * It became home when `GET /api/v1/platform/organizations` arrived in the
   * generated client (`LLD-ORGANIZATION.md` §2.8), which is exactly the change F1
   * §5 said would unblock P-04 - the list was never a design that was missing, it
   * was a route nobody had agreed.
   */
  practices: '/practices',

  /** Creating a practice with its branches and staff. A task opened from the list. */
  onboard: '/onboard',
} as const;

/**
 * One practice's own screen: what it is, how big it is, and its branches.
 *
 * A function rather than a constant because it takes the practice's id, and it is
 * here rather than built by hand at the two call sites - the row that opens it and
 * the back link that returns from it - so the shape of the address is written once.
 */
export function practicePath(id: string): string {
  return `${ROUTE_PATHS.practices}/${id}`;
}

/**
 * The form that edits one practice.
 *
 * IT IS A SCREEN WITH NO ROUTE UNDER HALF OF IT. The form reads a practice through
 * `getOrganizationById` and can fill itself in; what it cannot do is save, because
 * the published specification has four operations - list practices, read one,
 * onboard one, list plans - and not one of them changes a practice. See
 * `PracticeEdit` for what the screen does about that, and F1 §7 item 1e for who
 * owns the missing route.
 */
export function editPath(id: string): string {
  return `${practicePath(id)}/edit`;
}

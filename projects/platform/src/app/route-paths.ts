/**
 * Every path in this console, in one place.
 *
 * They live here rather than in the feature that owns the screen because the
 * things that link to a screen are not always inside it: the wordmark in the
 * header is the route home, and "Page not found" offers a way back. A feature
 * importing the layout, or the layout importing a feature, would be a dependency
 * in the wrong direction for the sake of a string.
 *
 * THE URL SAYS PRACTICE. The folder that implements it is `organizations`,
 * following the milestone's structure and the API's noun, but a URL is something
 * a platform administrator reads, and the product's vocabulary says practice.
 *
 * THERE IS NO `/practices` YET. It is the practice list, and P-04 is blocked on a
 * route nobody has agreed (F1 §5). The console's home is the one screen it has
 * until that exists; when it does, `/practices` becomes home and `/onboard`
 * becomes a task opened from it - a change to this file and to one redirect.
 */
export const ROUTE_PATHS = {
  /** The console's home and only screen: creating a practice with its branches. */
  onboard: '/onboard',
} as const;

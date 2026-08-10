/**
 * Every path in this console, in one place.
 *
 * They live here rather than in the feature that owns each screen because the
 * things that link to a screen are not always inside it: the wordmark in the
 * header is the route home, and "Page not found" offers a way back to the list.
 * A feature importing the layout, or the layout importing a feature, would be a
 * dependency in the wrong direction for the sake of two strings.
 *
 * THE URLS SAY PRACTICE. The folder that implements them is `organizations`,
 * following the milestone's structure and the API's noun, but a URL is something
 * a platform administrator reads, and the product's vocabulary says practice.
 */
export const ROUTE_PATHS = {
  /** The landing screen: every practice on the platform. */
  practices: '/practices',
  /** Onboarding a practice. The screen itself is P-05. */
  addPractice: '/practices/add',
} as const;

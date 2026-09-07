/**
 * English strings for the `auth` area: what a person is told before they are
 * signed in, and the one control that ends a session.
 *
 * IT IS AN AREA RATHER THAN PART OF `common` because the wording is owned. Five
 * of the six states a console can be in are screens nobody designed until T-111,
 * and three of them are the difference between a user who can act on what they
 * are reading and one who forwards a screenshot: "we could not sign you in" says
 * nothing, "the provider on this host is not answering" says where to look.
 *
 * NOTHING HERE NAMES KEYCLOAK. The product has reconsidered its identity provider
 * once already - it is the reason `DECISIONS.md` chose a library that is not tied
 * to one - and a string that names the current one would be wrong on the day it
 * changes and would be found by a user rather than by a compiler. The issuer is
 * interpolated by the page, which is both more specific and always true.
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const authEn = {
  /**
   * The product, as the heading of every pre-sign-in page.
   *
   * One heading across the five states, with the sentence under it carrying the
   * difference. A heading that changed as the console moved from checking to
   * redirecting would be three headings flashing past in under a second.
   */
  'auth.console.title': 'EPM',

  'auth.state.starting': 'Checking your sign-in…',
  'auth.state.redirecting': 'Taking you to sign in…',
  'auth.state.signing-in': 'Signing you in…',

  'auth.not-permitted.title': 'Your account is not set up for this console',
  'auth.not-permitted.body':
    'You signed in successfully, but this account does not have access to this console. Ask an administrator to set it up, or sign in with a different account.',

  'auth.provider-unreachable.title': 'Cannot reach the sign-in provider',
  'auth.provider-unreachable.body':
    'The console could not reach the identity provider, so nobody can be signed in. It may be starting up, or it may not be running.',

  /** Labels the issuer on the provider-unreachable page. */
  'auth.provider-unreachable.provider': 'Provider',

  'auth.action.sign-out': 'Sign out',
};

/** Every key this area defines. `auth.ar.ts` must define exactly these. */
export type AuthKey = keyof typeof authEn;

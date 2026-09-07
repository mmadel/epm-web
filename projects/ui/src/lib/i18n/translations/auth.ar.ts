import { AuthKey } from './auth.en';

/**
 * PLACEHOLDER - THESE VALUES ARE ENGLISH, NOT ARABIC.
 *
 * Nothing in this file has been translated. Clinical Arabic needs a clinician's
 * sign-off and that clinician has not been identified yet, so the gap is left
 * visible rather than filled with machine translation that would read as finished
 * work. See ./README.md before changing anything here.
 *
 * The type annotation is the point of this file being TypeScript: it fails the
 * build if a key here is missing or misspelt relative to `auth.en.ts`.
 */
export const authAr: Record<AuthKey, string> = {
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

  'auth.provider-unreachable.provider': 'Provider',

  'auth.action.sign-out': 'Sign out',
};

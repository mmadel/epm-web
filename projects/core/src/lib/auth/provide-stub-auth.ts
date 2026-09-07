import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  signal,
  WritableSignal,
} from '@angular/core';
import { Observable, of } from 'rxjs';

import { AuthStatus, AuthUser, CONSOLE_AUTH, ConsoleAuth } from './console-auth';

/** The person {@link provideStubAuth} signs in when it is not given another. */
export const STUB_AUTH_USER: AuthUser = {
  userId: 'stub-user',
  displayName: 'Signed In Person',
};

/**
 * A {@link ConsoleAuth} that is already in whatever state the caller asked for,
 * and that talks to nothing.
 *
 * FOR TESTS AND SCREENSHOTS, and it is in the library rather than in each console
 * for the reason `providePlatformAdminSession` is: every spec that mounts a
 * console needs one, three applications would otherwise write three, and the
 * three would drift. It signs nobody in - there is no provider behind it, no
 * request, and no redirect - so a spec can put a console into `notPermitted` or
 * `providerUnreachable` without a Keycloak to break.
 *
 * WHAT IT RECORDS IS AS MUCH THE POINT AS WHAT IT ANSWERS. Criteria 9 and 10 are
 * both about what the console does NOT do - a 403 must not retry the login - and
 * a stub that only answered questions could not tell a test that nothing was
 * asked.
 */
export interface StubAuth extends ConsoleAuth {
  /** Settable, so a spec can move a mounted console from one state to the next. */
  readonly status: WritableSignal<AuthStatus>;

  /** How many times {@link ConsoleAuth.signOut} was called. */
  readonly signOutCount: () => number;

  /** How many times {@link ConsoleAuth.sessionEnded} was called. */
  readonly sessionEndedCount: () => number;

  /** How many times {@link ConsoleAuth.refuse} was called. */
  readonly refuseCount: () => number;
}

/**
 * Builds the stub without registering it, for a spec that wants to hold on to it
 * and read what was called.
 *
 * @param options the state to start in, who is signed in, and the token to attach
 */
export function stubAuth(options?: {
  status?: AuthStatus;
  user?: AuthUser | undefined;
  issuer?: string;
  accessToken?: string;
}): StubAuth {
  const status = signal<AuthStatus>(options?.status ?? 'signedIn');
  const token = options?.accessToken ?? 'stub-access-token';

  let signOuts = 0;
  let endings = 0;
  let refusals = 0;

  return {
    status,
    user: signal(options === undefined || !('user' in options) ? STUB_AUTH_USER : options.user),
    issuer: options?.issuer ?? 'https://provider.test.invalid/realms/stub',
    accessToken: (): Observable<string> => of(token),
    signOut: () => {
      signOuts += 1;
      status.set('redirecting');
    },
    sessionEnded: () => {
      endings += 1;
      status.set('redirecting');
    },
    refuse: () => {
      refusals += 1;
      status.set('notPermitted');
    },
    signOutCount: () => signOuts,
    sessionEndedCount: () => endings,
    refuseCount: () => refusals,
  };
}

/**
 * Registers a {@link stubAuth} as the console's {@link CONSOLE_AUTH}.
 *
 * Defaults to somebody signed in, because that is the state nearly every spec
 * about a console is actually about - the routes, the frame, the screens - and
 * having to spell it out in each of them would be noise around the assertion.
 */
export function provideStubAuth(options?: Parameters<typeof stubAuth>[0]): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: CONSOLE_AUTH,
      // A factory rather than a value, so each injector - and so each test - gets
      // its own signals and its own counts instead of sharing one built when this
      // module was first evaluated.
      useFactory: () => stubAuth(options),
    },
  ]);
}

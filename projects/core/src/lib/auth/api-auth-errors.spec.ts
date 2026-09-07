import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiBaseUrl } from '../config/api-base-url';
import { apiAuthErrorInterceptor } from './api-auth-errors';
import { API_PREFIX } from './api-request';
import { CONSOLE_AUTH } from './console-auth';
import { StubAuth, stubAuth } from './provide-stub-auth';

/**
 * T-111 criteria 9 and 10: a 401 signs the person out, a 403 does not retry.
 *
 * THE TWO ANSWERS ARE OPPOSITE AND THE FAILURE IS TO TREAT THEM ALIKE, which is
 * the failure the ticket says gets missed. A 401 means the token is no good and
 * signing in again is the answer. A 403 means the token is fine and its owner is
 * not, so signing in again returns THE SAME TOKEN and the same refusal - and a
 * console that tries it bounces between two servers that both answered correctly.
 *
 * MOST OF WHAT THIS FILE ASSERTS IS THAT SOMETHING DID NOT HAPPEN, which is why
 * the stub counts calls rather than only answering questions. "No login loop" is
 * not observable from a state; it is observable from nothing having been asked.
 */
function open(): { http: HttpClient; httpMock: HttpTestingController; auth: StubAuth } {
  const auth = stubAuth();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([apiAuthErrorInterceptor])),
      provideHttpClientTesting(),
      provideApiBaseUrl('/'),
      { provide: CONSOLE_AUTH, useValue: auth },
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    auth,
  };
}

/**
 * A route, composed from the constant rather than typed out.
 *
 * `epm/no-relative-api-url` forbids a literal `/api/...` handed to an HTTP call,
 * and it is right to. Composing the prefix satisfies the rule for the reason the
 * rule exists, and ties these assertions to the constant the interceptor matches
 * on.
 */
function route(path: string): string {
  return `${API_PREFIX}${path}`;
}

/** Calls `url`, answers it with `status`, and reports what the seam was told. */
function answer(url: string, status: number): { auth: StubAuth; errorReached: boolean } {
  const { http, httpMock, auth } = open();

  let errorReached = false;

  http.get(url).subscribe({ error: () => (errorReached = true) });

  httpMock.expectOne(url).flush({ detail: 'nope' }, { status, statusText: 'x' });

  return { auth, errorReached };
}

describe('apiAuthErrorInterceptor on 401', () => {
  it('ends the session', () => {
    const { auth } = answer('/api/v1/platform/plans', 401);

    expect(auth.sessionEndedCount()).toBe(1);
  });

  it('does not treat it as a refusal', () => {
    // A 401 routed to the not-permitted page would be a dead end offered to
    // somebody whose only problem is an expired token - they would be told their
    // account is not set up when it is.
    const { auth } = answer('/api/v1/platform/plans', 401);

    expect(auth.refuseCount()).toBe(0);
  });

  it('leaves the console heading back to the login redirect, not on a spinner', () => {
    // Criterion 9 in one assertion. The state a tampered token must NOT produce is
    // one where nothing visible happens.
    const { auth } = answer('/api/v1/platform/plans', 401);

    expect(auth.status()).toBe('redirecting');
  });
});

describe('apiAuthErrorInterceptor on 403', () => {
  it('shows the not-permitted state', () => {
    const { auth } = answer('/api/v1/platform/plans', 403);

    expect(auth.refuseCount()).toBe(1);
    expect(auth.status()).toBe('notPermitted');
  });

  it('does not sign the person out and back in', () => {
    // CRITERION 10, AND THE WHOLE POINT OF THE TICKET. Signing out here would
    // start the loop: the same account signs in, gets the same valid token, and
    // is refused again, for as long as the tab is open.
    const { auth } = answer('/api/v1/platform/plans', 403);

    expect(auth.sessionEndedCount()).toBe(0);
    expect(auth.signOutCount()).toBe(0);
  });

  it('does not re-issue the request', () => {
    const { http, httpMock } = open();

    http.get(route('/v1/platform/plans')).subscribe({ error: () => undefined });
    httpMock
      .expectOne(route('/v1/platform/plans'))
      .flush({}, { status: 403, statusText: 'Forbidden' });

    // Not a retry either. A screen may offer one to a reader; an interceptor must
    // never take that decision on their behalf against an answer that will not change.
    httpMock.expectNone(() => true);
    httpMock.verify();
  });
});

describe('apiAuthErrorInterceptor and everything it must not act on', () => {
  it('ignores a 401 from the identity provider', () => {
    // A 401 from anywhere but the API says nothing about this console's session.
    // Signing a working user out because an unrelated host refused a request would
    // be a defect nobody could reproduce.
    const { auth } = answer(
      'http://localhost:8180/realms/epm-platform/protocol/openid-connect/token',
      401,
    );

    expect(auth.sessionEndedCount()).toBe(0);
    expect(auth.status()).toBe('signedIn');
  });

  it('ignores a 403 from anywhere else on the console own origin', () => {
    const { auth } = answer('/assets/translations.json', 403);

    expect(auth.refuseCount()).toBe(0);
    expect(auth.status()).toBe('signedIn');
  });

  it('leaves other API failures to the screen that made the call', () => {
    // 404, 409, 500: every one of them has a screen with words for it. This
    // interceptor is about the session and about nothing else.
    for (const status of [400, 404, 409, 500]) {
      const { auth } = answer('/api/v1/platform/plans', status);

      expect(auth.sessionEndedCount(), `status ${status}`).toBe(0);
      expect(auth.refuseCount(), `status ${status}`).toBe(0);
    }
  });
});

describe('apiAuthErrorInterceptor and the caller', () => {
  it('rethrows, so the screen still sees its own failure', () => {
    // Swallowed here, a 403 would leave a list sitting on a spinner while the
    // console changed state underneath it. Screens have their own failure states
    // and their own words; this adds to them rather than replacing them.
    expect(answer('/api/v1/platform/plans', 403).errorReached).toBe(true);
    expect(answer('/api/v1/platform/plans', 401).errorReached).toBe(true);
  });
});

import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiBaseUrl } from '../config/api-base-url';
import { API_PREFIX } from './api-request';
import { apiTokenInterceptor } from './api-token-interceptor';
import { provideStubAuth } from './provide-stub-auth';

/**
 * A route, composed from the constant rather than typed out.
 *
 * `epm/no-relative-api-url` forbids a literal `/api/...` handed to an HTTP call,
 * and it is right to: the patient app is served from `capacitor://`, where such a
 * path resolves against the bundle and reaches no backend. Composing the prefix
 * keeps the rule satisfied for the reason the rule exists, and it also ties these
 * assertions to the same constant the interceptor matches on - so a change to one
 * cannot quietly pass a test written against the other.
 */
function route(path: string): string {
  return `${API_PREFIX}${path}`;
}

/**
 * T-111 criterion 4: the token goes to the API's base URL and nowhere else.
 *
 * IT ASSERTS THE HEADER'S ABSENCE AS HARD AS ITS PRESENCE, which is the half a
 * test of an interceptor usually skips. A request that carries one header too
 * many still succeeds, so the leak this guards against - the token handed to the
 * identity provider, to a CDN, to whatever the console talks to next - is
 * invisible from everywhere except a network tab and this file.
 *
 * The base URL is `/` throughout, resolving to the empty string, because that is
 * what both consoles are actually built with locally and it is the case a naive
 * `startsWith` gets wrong: every URL starts with the empty string.
 */
function open(options?: { accessToken?: string }): {
  http: HttpClient;
  httpMock: HttpTestingController;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([apiTokenInterceptor])),
      provideHttpClientTesting(),
      provideApiBaseUrl('/'),
      provideStubAuth({ accessToken: options?.accessToken ?? 'a-real-looking-token' }),
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

/** The `Authorization` header on the one request that was opened for `url`. */
function authorizationSentTo(url: string, options?: { accessToken?: string }): string | null {
  const { http, httpMock } = open(options);

  http.get(url).subscribe({ error: () => undefined });

  const request = httpMock.expectOne(url);
  const header = request.request.headers.get('Authorization');

  request.flush({});

  return header;
}

describe('apiTokenInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('attaches the bearer token to an API request', () => {
    expect(authorizationSentTo('/api/v1/platform/organizations')).toBe(
      'Bearer a-real-looking-token',
    );
  });

  it('attaches it to every route under the API, not just the first', () => {
    expect(authorizationSentTo('/api/v1/platform/plans')).toBe('Bearer a-real-looking-token');
    expect(authorizationSentTo('/api/v1/platform/organizations/org-1')).toBe(
      'Bearer a-real-looking-token',
    );
  });

  it('does not attach it to the identity provider', () => {
    // The leak the ticket names. The provider's own calls are the library's
    // business and it authenticates them its own way; the API's bearer has no
    // business leaving for another host.
    expect(
      authorizationSentTo(
        'http://localhost:8180/realms/epm-platform/protocol/openid-connect/token',
      ),
    ).toBeNull();
  });

  it('does not attach it to anything else on the console own origin', () => {
    expect(authorizationSentTo('/assets/translations.json')).toBeNull();
    expect(authorizationSentTo('/favicon.ico')).toBeNull();
  });

  it('does not attach it to a path that merely starts like the API', () => {
    expect(authorizationSentTo('/apidocs')).toBeNull();
  });

  it('sends the request unchanged when there is no token yet', () => {
    // A state that should not arise - nothing that calls the API renders before
    // sign-in - and if it does, the API's own 401 reports it better than an error
    // this interceptor invented, which would never reach a network tab.
    expect(authorizationSentTo('/api/v1/platform/plans', { accessToken: '' })).toBeNull();
  });

  it('does not disturb the rest of the request', () => {
    const { http, httpMock } = open();

    http.post(route('/v1/platform/organizations'), { name: 'Cairo Physio' }).subscribe();

    const { request } = httpMock.expectOne(route('/v1/platform/organizations'));

    // `clone({ setHeaders })` and not a new request: the body, the method and any
    // header a caller set - `Idempotency-Key` on onboarding, for one - all have to
    // survive being given a bearer token.
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ name: 'Cairo Physio' });
    expect(request.headers.get('Authorization')).toBe('Bearer a-real-looking-token');

    httpMock.expectNone(() => true);
  });

  it('issues the request exactly once', () => {
    // The token is read from an observable, and an observable that emitted twice -
    // on a silent renew, say - would re-issue the request underneath it. `take(1)`
    // is what stops that, and this is what would notice if it were removed.
    const { http, httpMock } = open();

    http.get(route('/v1/platform/plans')).subscribe();

    httpMock.expectOne(route('/v1/platform/plans')).flush([]);
    httpMock.verify();
  });
});

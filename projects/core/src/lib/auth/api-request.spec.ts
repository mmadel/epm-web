import { isApiRequest } from './api-request';

/**
 * The whole of T-111 criterion 4, argued with directly.
 *
 * "The network tab shows `Authorization: Bearer` on API calls and on nothing
 * else." The interceptor's spec proves the header goes on and comes off; this
 * proves the decision underneath it, on the cases a running console would take
 * days to produce - a deployed base URL, a look-alike host, a path that starts
 * with the prefix and is not under it.
 */
describe('isApiRequest, under `ng serve` (same origin)', () => {
  const ORIGIN = 'http://localhost:4400';

  // The empty string is what `provideApiBaseUrl('/')` resolves to, which is what
  // every console is built with locally.
  function isApi(url: string): boolean {
    return isApiRequest(url, '', ORIGIN);
  }

  it('matches the relative path the generated client builds', () => {
    // `${basePath}${localVarPath}` with an empty base path is exactly this, and
    // it is the shape that keeps the browser on one origin: the dev server
    // proxies it to :8080, so there is no preflight and no CORS to configure.
    expect(isApi('/api/v1/platform/organizations')).toBe(true);
    expect(isApi('/api/v1/platform/organizations/org-1/edit')).toBe(true);
    expect(isApi('/api')).toBe(true);
  });

  it('matches the same request written absolutely against its own origin', () => {
    // Nothing in this workspace builds one, and it must not be the difference
    // between a token attached and a token missing if something ever does.
    expect(isApi(`${ORIGIN}/api/v1/platform/plans`)).toBe(true);
  });

  it('does not match the identity provider', () => {
    // THE ONE THAT MATTERS MOST. Attaching the token here would hand the API's
    // bearer to the provider on every discovery, renew and userinfo call.
    expect(isApi('http://localhost:8180/realms/epm-platform/protocol/openid-connect/token')).toBe(
      false,
    );
  });

  it('does not match anything else the console fetches from its own origin', () => {
    // The trap `startsWith(base)` falls into: with an empty base URL every string
    // starts with it, so the naive implementation puts the token on all of these.
    expect(isApi('/assets/logo.svg')).toBe(false);
    expect(isApi('/favicon.ico')).toBe(false);
    expect(isApi('/')).toBe(false);
    expect(isApi(`${ORIGIN}/index.html`)).toBe(false);
  });

  it('requires the prefix to end at a segment boundary', () => {
    // `/apidocs` is not the API. A bare prefix comparison sends it the token.
    expect(isApi('/apidocs')).toBe(false);
    expect(isApi('/apiary/v1')).toBe(false);
  });

  it('matches with a query string or a fragment on the end', () => {
    // The practice list keeps its search in the address, and the generated client
    // appends query parameters; neither changes which host is being called.
    expect(isApi('/api/v1/platform/organizations?name=care&page=2')).toBe(true);
    expect(isApi('/api/v1/platform/organizations#anchor')).toBe(true);
  });
});

describe('isApiRequest, deployed (an absolute base URL)', () => {
  const ORIGIN = 'https://console.epm.example';
  const BASE = 'https://api.epm.example';

  function isApi(url: string): boolean {
    return isApiRequest(url, BASE, ORIGIN);
  }

  it('matches the API on its own host', () => {
    expect(isApi(`${BASE}/api/v1/platform/organizations`)).toBe(true);
  });

  it('does not match the console it is served from', () => {
    expect(isApi('/api/v1/platform/organizations')).toBe(false);
    expect(isApi(`${ORIGIN}/api/v1/platform/organizations`)).toBe(false);
  });

  it('does not match a host that merely starts with the base URL', () => {
    // The second thing `startsWith` gets wrong, and the one that is an attack
    // rather than a bug: this host is not the API and a prefix comparison says it
    // is, so the token leaves for somebody else's server.
    expect(isApi('https://api.epm.example.attacker.test/api/v1/platform/plans')).toBe(false);
  });

  it('does not match the same host on a different scheme or port', () => {
    // `origin` comparison, not hostname. A token sent over http: to a host that is
    // https: elsewhere has been sent in the clear.
    expect(isApi('http://api.epm.example/api/v1/platform/plans')).toBe(false);
    expect(isApi('https://api.epm.example:8443/api/v1/platform/plans')).toBe(false);
  });

  it('honours a base URL that carries a path of its own', () => {
    // A gateway that mounts the API under a prefix. The API is under THAT path
    // plus `/api`, not under `/api` at the root of the host.
    expect(
      isApiRequest('https://gw.example/epm/api/v1/plans', 'https://gw.example/epm', ORIGIN),
    ).toBe(true);
    expect(isApiRequest('https://gw.example/api/v1/plans', 'https://gw.example/epm', ORIGIN)).toBe(
      false,
    );
  });
});

describe('isApiRequest, on input it cannot make sense of', () => {
  it('answers false rather than throwing', () => {
    // An unparseable URL fails on its own further down, with a message about the
    // URL. What must not happen is this throwing inside an interceptor and turning
    // one bad URL into a console that can make no request at all.
    expect(isApiRequest('http://[', '', 'http://localhost:4400')).toBe(false);
    expect(isApiRequest('/api/v1/plans', 'not a url', 'http://localhost:4400')).toBe(false);
  });
});

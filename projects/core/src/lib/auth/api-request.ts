/**
 * The one path prefix every route in the published specification sits under.
 *
 * It is the same `/api` that `proxy.conf.json` forwards and that
 * `tools/dev-proxy/check-proxy.mjs` holds the proxy to, spelled the same way and
 * for the same reason: it is where the API is, rather than a URL anything here
 * builds. Nothing in this file makes a request - it decides whether a request
 * SOMETHING ELSE made is going to the API - so the base URL still comes from
 * {@link API_BASE_URL} and never from a literal.
 */
export const API_PREFIX = '/api';

/**
 * Whether a request is going to the EPM API, and therefore whether the access
 * token may be put on it.
 *
 * THIS IS THE WHOLE OF T-111 CRITERION 4, and it is a pure function so that it
 * can be argued with directly. The temptation the ticket names - attach the
 * header to everything, because matching is fiddly - leaks the token to every
 * host the console talks to, starting with the identity provider itself.
 *
 * IT MATCHES ON ORIGIN AND PATH, NOT ON A PREFIX OF THE STRING. `startsWith` is
 * the obvious implementation and it is wrong twice over: with an empty base URL
 * (same origin, which is what `ng serve` gives every console) every string starts
 * with it, so the token would go on the translations, the favicon and anything
 * else fetched through `HttpClient`; and with a base URL it would call
 * `https://api.example.com.attacker.test/` a match.
 *
 * @param requestUrl the URL as `HttpClient` was given it - relative or absolute
 * @param apiBaseUrl {@link API_BASE_URL}: an absolute http(s) URL, or the empty
 *   string for "the origin this console is served from"
 * @param origin the origin the console is served from, which is what a relative
 *   URL resolves against
 */
export function isApiRequest(requestUrl: string, apiBaseUrl: string, origin: string): boolean {
  const base = safeUrl(apiBaseUrl === '' ? origin : apiBaseUrl, origin);
  const target = safeUrl(requestUrl, origin);

  if (base === undefined || target === undefined || target.origin !== base.origin) {
    return false;
  }

  // A base URL may carry a path of its own (`https://gateway.example.com/epm`),
  // so the API lives under that path plus the prefix rather than under the prefix
  // alone. Same origin leaves the base path empty and this reads as `/api`.
  const apiRoot = `${base.pathname.replace(/\/+$/, '')}${API_PREFIX}`;

  // The prefix has to end at a segment boundary. `/apidocs` is not the API, and a
  // bare `startsWith` would send it the token.
  return target.pathname === apiRoot || target.pathname.startsWith(`${apiRoot}/`);
}

/**
 * `new URL`, but answering `undefined` instead of throwing.
 *
 * An unparseable request URL is not the token's problem to solve: it fails on its
 * own, further down, with a message about the URL. What must not happen is this
 * function throwing from inside an interceptor and turning a bad URL into a
 * console that cannot make any request at all.
 */
function safeUrl(value: string, origin: string): URL | undefined {
  try {
    return new URL(value, origin);
  } catch {
    return undefined;
  }
}

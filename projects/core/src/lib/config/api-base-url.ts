import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Base URL of the EPM API: an absolute `http:`/`https:` URL, or the empty string
 * when the application is served from the API's own origin.
 *
 * Deliberately declared without `providedIn`/factory default: a deployed
 * application is generally NOT served from the API's origin (the patient app runs
 * from a `capacitor://` one), so a same-origin fallback would be silently wrong.
 * A missing provider must fail loudly at injection time instead.
 *
 * The empty string is not a fallback and cannot be arrived at by accident - see
 * {@link provideApiBaseUrl}. It is reached only from the value `/`, written
 * deliberately, and it exists for `ng serve`: the dev server proxies `/api` to the
 * backend (T-92), so the browser makes a same-origin request and there is no
 * preflight to configure CORS for.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * Provides {@link API_BASE_URL}.
 *
 * @param url An absolute `http:`/`https:` URL, or `/` for "the origin this
 *   application is served from". A trailing slash is removed, which is what turns
 *   `/` into the empty string.
 * @throws Error when `url` is empty/whitespace, relative but not exactly `/`, not
 *   absolute, or not http(s).
 */
export function provideApiBaseUrl(url: string): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: API_BASE_URL,
      useValue: normalizeApiBaseUrl(url),
    },
  ]);
}

function normalizeApiBaseUrl(url: string): string {
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      `API_BASE_URL must be a non-empty absolute http(s) URL (for example "https://api.example.com"), or "/" for the origin this application is served from, but received ${describe(url)}.`,
    );
  }

  const candidate = url.trim();

  // SAME ORIGIN, SAID ON PURPOSE. `/` is the one relative value accepted, and the
  // asymmetry with the empty string above is the whole safeguard: an unset
  // variable, a deleted line in a `.env` and a shell that expanded to nothing all
  // arrive here as `''`, and all of them are mistakes. Nothing produces `/` except
  // somebody typing it. It is also the specification's own vocabulary - the
  // published OpenAPI document declares its server as `/`, "wherever this document
  // was served from".
  if (candidate === '/') {
    return '';
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `API_BASE_URL must be an absolute URL including protocol and host (for example "https://api.example.com"), or exactly "/" for the origin this application is served from, but received ${describe(candidate)}, which is not absolute.`,
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `API_BASE_URL must use the http: or https: protocol, but received ${describe(candidate)}, which uses "${parsed.protocol}".`,
    );
  }

  return candidate.replace(/\/+$/, '');
}

function describe(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

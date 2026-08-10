import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Absolute base URL of the EPM API.
 *
 * Deliberately declared without `providedIn`/factory default: the applications are
 * deployed separately from the API (the patient app runs from a `capacitor://`
 * origin), so a same-origin or relative fallback would be silently wrong. A missing
 * provider must fail loudly at injection time instead.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * Provides {@link API_BASE_URL}.
 *
 * @param url An absolute `http:`/`https:` URL. A trailing slash is removed.
 * @throws Error when `url` is empty/whitespace, not absolute, or not http(s).
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
      `API_BASE_URL must be a non-empty absolute http(s) URL (for example "https://api.example.com"), but received ${describe(url)}.`,
    );
  }

  const candidate = url.trim();

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `API_BASE_URL must be an absolute URL including protocol and host (for example "https://api.example.com"), but received ${describe(candidate)}, which is not absolute.`,
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

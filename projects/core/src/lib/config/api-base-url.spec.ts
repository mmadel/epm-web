import { TestBed } from '@angular/core/testing';

import { API_BASE_URL, provideApiBaseUrl } from './api-base-url';

// A relative API path is exactly what provideApiBaseUrl must reject, so the
// literal has to appear here. The rule is switched off for this one line, with a
// reason, rather than evaded by building the string at runtime - a rule you can
// route around with string concatenation is a rule the next person routes around
// too, and a disable comment is greppable where a join is not.
// eslint-disable-next-line epm/no-relative-api-url -- fixture for the rejection tests below
const RELATIVE_API_PATH = '/api';

describe('provideApiBaseUrl', () => {
  it('provides API_BASE_URL', () => {
    TestBed.configureTestingModule({
      providers: [provideApiBaseUrl('https://api.example.com')],
    });

    expect(TestBed.inject(API_BASE_URL)).toBe('https://api.example.com');
  });

  it('normalizes away a trailing slash', () => {
    TestBed.configureTestingModule({
      providers: [provideApiBaseUrl('https://api.example.com/v1/')],
    });

    expect(TestBed.inject(API_BASE_URL)).toBe('https://api.example.com/v1');
  });

  it('accepts http as well as https', () => {
    TestBed.configureTestingModule({
      providers: [provideApiBaseUrl('http://localhost:8080')],
    });

    expect(TestBed.inject(API_BASE_URL)).toBe('http://localhost:8080');
  });

  it('throws when the URL is empty', () => {
    expect(() => provideApiBaseUrl('')).toThrowError(/non-empty absolute http\(s\) URL/);
  });

  it('throws when the URL is whitespace only', () => {
    expect(() => provideApiBaseUrl('   ')).toThrowError(/non-empty absolute http\(s\) URL/);
  });

  it('throws when the URL is relative', () => {
    expect(() => provideApiBaseUrl(RELATIVE_API_PATH)).toThrowError(/not absolute/);
  });

  it('throws when the URL has no protocol', () => {
    expect(() => provideApiBaseUrl('api.example.com')).toThrowError(/not absolute/);
  });

  it('throws when the protocol is not http(s)', () => {
    expect(() => provideApiBaseUrl('ftp://api.example.com')).toThrowError(
      /http: or https: protocol/,
    );
  });

  it('names the received value in the thrown message', () => {
    expect(() => provideApiBaseUrl(RELATIVE_API_PATH)).toThrowError(
      new RegExp(`"${RELATIVE_API_PATH}"`),
    );
  });

  it('fails injection when no provider is registered', () => {
    TestBed.configureTestingModule({ providers: [] });

    expect(() => TestBed.inject(API_BASE_URL)).toThrow();
  });
});

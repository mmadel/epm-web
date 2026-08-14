import { ApplicationRef, DOCUMENT, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BASE_PATH } from 'api-client';
import { API_BASE_URL } from 'core';

import { API_BASE_URL_VALUE } from '../environments/environment.generated';
import { appConfig } from './app.config';

describe('staff appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('provides API_BASE_URL', () => {
    expect(() => TestBed.inject(API_BASE_URL)).not.toThrow();
  });

  it('provides an API base URL that is absolute http(s), or same origin', () => {
    const apiBaseUrl = TestBed.inject(API_BASE_URL);

    // Two legal shapes, and which one this is depends on what the build was given.
    // Deployed, the app is not served from the API's origin and the URL is
    // absolute. Under `ng serve` it is the empty string, and proxy.conf.json
    // forwards /api to the local backend (T-92) - same origin, so no preflight.
    if (apiBaseUrl === '') {
      expect(API_BASE_URL_VALUE.trim()).toBe('/');
    } else {
      expect(['http:', 'https:']).toContain(new URL(apiBaseUrl).protocol);
      expect(apiBaseUrl.endsWith('/')).toBe(false);
    }
  });
});

describe('staff appConfig and the generated client', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('gives the generated client the validated base URL', () => {
    // Not merely "BASE_PATH is set": it is the SAME value the validation produced.
    // A second provider handed the raw build value would pass an existence check
    // and be free to disagree with this one after any edit.
    expect(TestBed.inject(BASE_PATH)).toBe(TestBed.inject(API_BASE_URL));
  });

  it('provides BASE_PATH exactly once, at the application root', () => {
    const basePathProviders = appConfig.providers
      .flat(Infinity)
      .filter((provider): provider is Exclude<Provider, unknown[]> => typeof provider === 'object')
      .filter((provider) => 'provide' in provider && provider.provide === BASE_PATH);

    // The count is the point. The generated `BaseService` falls back to
    // `http://localhost` when BASE_PATH is absent, which makes a missing provider
    // silent; a second one further down the array would be just as silent, and
    // would win.
    expect(basePathProviders).toHaveLength(1);
  });
});

describe('staff appConfig language', () => {
  it('labels the document with lang and dir at bootstrap', () => {
    const documentRef = document.implementation.createHTMLDocument('test');

    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentRef }, ...appConfig.providers],
    });
    TestBed.inject(ApplicationRef);
    TestBed.tick();

    expect(documentRef.documentElement.getAttribute('lang')).toBe('en');
    expect(documentRef.documentElement.getAttribute('dir')).toBe('ltr');
  });
});

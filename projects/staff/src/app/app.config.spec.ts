import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from 'core';

import { appConfig } from './app.config';

describe('staff appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('provides API_BASE_URL', () => {
    expect(() => TestBed.inject(API_BASE_URL)).not.toThrow();
  });

  it('provides a non-empty absolute http(s) API base URL', () => {
    const apiBaseUrl = TestBed.inject(API_BASE_URL);

    expect(apiBaseUrl.trim().length).toBeGreaterThan(0);
    expect(['http:', 'https:']).toContain(new URL(apiBaseUrl).protocol);
    expect(apiBaseUrl.endsWith('/')).toBe(false);
  });
});

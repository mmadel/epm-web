import { TestBed } from '@angular/core/testing';

import {
  ENVIRONMENT_NAME,
  ENVIRONMENT_NAMES,
  provideEnvironmentName,
  resolveEnvironmentName,
} from './environment-name';

describe('resolveEnvironmentName', () => {
  it.each([...ENVIRONMENT_NAMES])('keeps %s', (name) => {
    expect(resolveEnvironmentName(name)).toBe(name);
  });

  it.each([
    ['an unset variable', ''],
    ['a typo', 'prodction'],
    ['a name from some other topology', 'qa'],
    ['the wrong case', 'Production'],
    ['whitespace', '  staging  '],
    ['a non-string', 42],
    ['null', null],
    ['undefined', undefined],
  ])('resolves %s to unknown', (_description, raw) => {
    // Every one of these has to land somewhere, and they all land on the state
    // that is drawn as production. The alternative - guessing, or trimming, or
    // lower-casing until something matches - is how a staging build ends up
    // confidently labelled as something it is not.
    expect(resolveEnvironmentName(raw)).toBe('unknown');
  });
});

describe('provideEnvironmentName', () => {
  it('narrows the build value once, at configuration time', () => {
    TestBed.configureTestingModule({ providers: [provideEnvironmentName('nonsense')] });

    // Not `'nonsense'` reaching a component that then has to know what to do
    // with it: there is one narrowing, and no screen repeats it.
    expect(TestBed.inject(ENVIRONMENT_NAME)).toBe('unknown');
  });

  it('provides a recognised name unchanged', () => {
    TestBed.configureTestingModule({ providers: [provideEnvironmentName('staging')] });

    expect(TestBed.inject(ENVIRONMENT_NAME)).toBe('staging');
  });
});

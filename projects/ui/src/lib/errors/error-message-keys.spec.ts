import { TRANSLATIONS } from '../i18n/translations';
import {
  ERROR_MESSAGE_KEYS,
  ErrorCode,
  errorMessageKey,
  lookUpErrorMessageKey,
  UNKNOWN_ERROR_MESSAGE_KEY,
} from './error-message-keys';
import { PROBLEM_FIXTURES } from './problem.fixture';

const CODES = Object.keys(ERROR_MESSAGE_KEYS) as ErrorCode[];

/** A code shaped like a real one that this build has no row for. */
const UNMAPPED = 'EPM-XXX-999';

describe('the code registry', () => {
  it('words every code the client knows about', () => {
    // The types already say this; asserting it at runtime as well means a future
    // change that widens a type cannot quietly leave a code without wording.
    for (const code of CODES) {
      const key = ERROR_MESSAGE_KEYS[code];

      for (const [language, translations] of Object.entries(TRANSLATIONS)) {
        expect(Object.keys(translations), `${language} wording for ${code}`).toContain(key);
      }
    }
  });

  it('keeps every code in the shape the API issues them in', () => {
    for (const code of CODES) {
      expect(code).toMatch(/^EPM-[A-Z]{3}-\d{3}$/);
    }
  });

  it('keeps all of its wording in the errors area', () => {
    for (const code of CODES) {
      expect(ERROR_MESSAGE_KEYS[code]).toMatch(/^errors\./);
    }
  });

  it('reports a code it has no row for as a miss, rather than guessing', () => {
    expect(lookUpErrorMessageKey(UNMAPPED)).toBeUndefined();
  });

  it('resolves a miss to the generic key, which exists', () => {
    // The ordering that F-04.5 turns on: the miss becomes a real key here, before
    // anything reaches TranslationService, which would otherwise render the key it was
    // handed - on screen, to a user.
    expect(errorMessageKey(UNMAPPED)).toBe(UNKNOWN_ERROR_MESSAGE_KEY);
    expect(Object.keys(TRANSLATIONS.en)).toContain(UNKNOWN_ERROR_MESSAGE_KEY);
    expect(Object.keys(TRANSLATIONS.ar)).toContain(UNKNOWN_ERROR_MESSAGE_KEY);
  });

  it('resolves a code it does have a row for to that row', () => {
    for (const code of CODES) {
      expect(errorMessageKey(code)).toBe(ERROR_MESSAGE_KEYS[code]);
    }
  });

  it('is not confused by a body with no code at all', () => {
    // Not reachable through the type, but reachable over the network: a proxy or a
    // gateway can answer with a body of its own shape.
    expect(errorMessageKey('')).toBe(UNKNOWN_ERROR_MESSAGE_KEY);
  });

  it('does not answer for a property every object has', () => {
    // The failure mode of a plain object used as a lookup table: 'constructor' or
    // 'toString' resolving to something inherited, and a function reaching the
    // translator as if it were a key.
    for (const inherited of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(lookUpErrorMessageKey(inherited)).toBeUndefined();
      expect(errorMessageKey(inherited)).toBe(UNKNOWN_ERROR_MESSAGE_KEY);
    }
  });
});

describe('the fixtures', () => {
  it('cover every code in the registry', () => {
    expect(Object.keys(PROBLEM_FIXTURES).sort()).toEqual([...CODES].sort());
  });

  it('carry the code they are filed under', () => {
    for (const code of CODES) {
      expect(PROBLEM_FIXTURES[code].code).toBe(code);
    }
  });

  it('carry a developer-facing title and a trace id, as the real responses do', () => {
    for (const code of CODES) {
      expect(PROBLEM_FIXTURES[code].title, `title of ${code}`).toBeTruthy();
      expect(PROBLEM_FIXTURES[code].traceId, `traceId of ${code}`).toBeTruthy();
    }
  });

  it('carry the extra fields the wording for their code names', () => {
    expect(PROBLEM_FIXTURES['EPM-ORG-006']['limit']).toBe(5);
    expect(PROBLEM_FIXTURES['EPM-ORG-006']['requested']).toBe(7);
    expect(PROBLEM_FIXTURES['EPM-ORG-008']['limit']).toBe(3);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Language, LANGUAGE_STORAGE, LanguageService } from 'core';

import { TRANSLATIONS } from '../i18n/translations';
import { ERROR_MESSAGE_KEYS, ErrorCode, UNKNOWN_ERROR_MESSAGE_KEY } from './error-message-keys';
import { ErrorMessage } from './error-message';
import { ProblemDetails } from './problem';
import { PROBLEM_FIXTURES, UNMAPPED_CODE_PROBLEM } from './problem.fixture';

const LANGUAGES: readonly Language[] = ['en', 'ar'];

// Driven off the registry rather than off a list written here, so a code added to the
// registry is covered by these tests without anyone remembering to add it.
const CODES = Object.keys(ERROR_MESSAGE_KEYS) as ErrorCode[];

/** Builds the component in `language`, with nothing carried over from another test. */
async function render(
  problem: ProblemDetails,
  language: Language,
): Promise<ComponentFixture<ErrorMessage>> {
  TestBed.configureTestingModule({
    // No storage: a language chosen in one test must not be remembered by the next.
    providers: [{ provide: LANGUAGE_STORAGE, useValue: null }],
  });

  // Set before the component exists, so this is a render in that language rather than
  // a render in English followed by a switch.
  TestBed.inject(LanguageService).setLanguage(language);

  const fixture = TestBed.createComponent(ErrorMessage);
  fixture.componentRef.setInput('problem', problem);
  await fixture.whenStable();

  return fixture;
}

/** What a reader sees. */
function textOf(fixture: ComponentFixture<ErrorMessage>): string {
  return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
}

/**
 * Everything in the DOM, attributes included.
 *
 * Assertions about what is *not* shown are made against this rather than against the
 * text, because a `title` or `aria-label` attribute is not text content and is exactly
 * where a developer-facing string would end up if someone decided it was "just a
 * tooltip".
 */
function markupOf(fixture: ComponentFixture<ErrorMessage>): string {
  return (fixture.nativeElement as HTMLElement).innerHTML;
}

/**
 * The template with its placeholders filled from the body.
 *
 * Written with split/join rather than by calling the translator, so that the expected
 * value is arrived at independently of the code under test: an assertion computed by
 * the implementation it is checking proves only that the implementation is consistent
 * with itself.
 */
function fill(template: string, problem: ProblemDetails): string {
  let filled = template;

  for (const [name, value] of Object.entries(problem)) {
    if (typeof value === 'string' || typeof value === 'number') {
      filled = filled.split(`{${name}}`).join(String(value));
    }
  }

  return filled;
}

beforeEach(() => {
  // The component logs every problem it is shown, and the unknown-code case warns as
  // well. Both are behaviour under test below; silencing them here keeps the run
  // readable and makes the calls assertable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  // LanguageService labels the shared document; leaving it labelled Arabic would be
  // inherited by whatever spec file runs next.
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
});

for (const language of LANGUAGES) {
  describe(`ErrorMessage in ${language}`, () => {
    for (const code of CODES) {
      const problem = PROBLEM_FIXTURES[code];
      const template = TRANSLATIONS[language][ERROR_MESSAGE_KEYS[code]];

      it(`words ${code} for a reader`, async () => {
        const fixture = await render(problem, language);

        expect(textOf(fixture)).toBe(fill(template, problem));
      });

      it(`renders ${code} as a sentence rather than as data`, async () => {
        const fixture = await render(problem, language);
        const text = textOf(fixture);

        expect(text.length).toBeGreaterThan(0);
        // An unfilled {placeholder}, a translation key, the code, the trace id and the
        // type URI: five ways this could have shown someone the response instead of a
        // message, all of which have to stay absent for every code.
        expect(text).not.toContain('{');
        expect(markupOf(fixture)).not.toContain('errors.');
        expect(markupOf(fixture)).not.toContain(code);
        expect(markupOf(fixture)).not.toContain(String(problem.traceId));
        expect(markupOf(fixture)).not.toContain('https://errors.epm');
      });

      it(`keeps the developer-facing title of ${code} out of the DOM`, async () => {
        const fixture = await render(problem, language);
        // This fixture's own title, not a string written into the test: every fixture
        // carries a different one, and each has to be absent from its own rendering.
        const title = String(problem.title);

        expect(title.length).toBeGreaterThan(0);
        expect(markupOf(fixture).toLowerCase()).not.toContain(title.toLowerCase());
        expect(
          (fixture.nativeElement as HTMLElement).querySelectorAll(
            '[title], [aria-label], [aria-labelledby]',
          ),
        ).toHaveLength(0);
      });
    }

    it('shows the generic message for a code it has never heard of', async () => {
      const fixture = await render(UNMAPPED_CODE_PROBLEM, language);

      expect(textOf(fixture)).toBe(TRANSLATIONS[language][UNKNOWN_ERROR_MESSAGE_KEY]);
    });
  });
}

describe('the title assertion above', () => {
  it('notices a title that does reach the DOM', async () => {
    // Guards the guard. If innerHTML were the wrong thing to assert against - or if
    // `not.toContain` were quietly passing on every string - the tests above would
    // hold no matter what the component rendered. This puts a title in an attribute,
    // the least visible place it could go, and checks that it is caught.
    const problem = PROBLEM_FIXTURES['EPM-ORG-002'];
    const fixture = await render(problem, 'en');
    const title = String(problem.title);

    (fixture.nativeElement as HTMLElement).querySelector('p')?.setAttribute('title', title);

    expect(markupOf(fixture).toLowerCase()).toContain(title.toLowerCase());
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[title]').length,
    ).toBeGreaterThan(0);
  });
});

describe('EPM-ORG-006, the one a growing practice meets first', () => {
  const problem = PROBLEM_FIXTURES['EPM-ORG-006'];

  it('names both numbers', async () => {
    // The requirement, stated on its own: a message that named only the limit would
    // leave the reader counting staff to find out how far over they are.
    const text = textOf(await render(problem, 'en'));

    expect(text).toContain(String(problem['limit']));
    expect(text).toContain(String(problem['requested']));
  });

  it('reads exactly as it was written', async () => {
    // Pinned deliberately. This is the error a practice hits while it is growing, and
    // the difference between understanding it and raising a support ticket is the
    // wording - so a reword should be a decision someone makes, not a diff that slips
    // through. The two options after the numbers are the only two that exist: there is
    // nothing here to retry.
    expect(textOf(await render(problem, 'en'))).toBe(
      'Your plan covers 5 staff members and this change would need 7. ' +
        'Add seats to your plan, or move to a plan that includes more.',
    );
  });
});

describe('EPM-ORG-008', () => {
  it('names the limit it carries', async () => {
    const problem = PROBLEM_FIXTURES['EPM-ORG-008'];
    const text = textOf(await render(problem, 'en'));

    expect(text).toContain(String(problem['limit']));
  });
});

describe('ErrorMessage, given a code this build has never heard of', () => {
  let fixture: ComponentFixture<ErrorMessage>;

  beforeEach(async () => {
    fixture = await render(UNMAPPED_CODE_PROBLEM, 'en');
  });

  it('shows the generic message', () => {
    expect(textOf(fixture)).toBe(TRANSLATIONS.en[UNKNOWN_ERROR_MESSAGE_KEY]);
  });

  it('shows something', () => {
    // Stated separately from the assertion above so that this survives a rewording of
    // the generic message. A blank screen is the failure this subtask exists to stop.
    expect(textOf(fixture).length).toBeGreaterThan(0);
  });

  it('never renders the translation key', () => {
    // The trap this subtask is really about. TranslationService renders an unknown key
    // as the key itself - right for a key a developer typed, catastrophic for a code
    // that arrived over the network - so the fallback to a key that exists has to
    // happen in the registry lookup, before translation is asked anything. If it were
    // to happen after, this would read "errors.unknown.EPM-BIL-042".
    expect(markupOf(fixture)).not.toContain('errors.');
  });

  it('never shows the raw code', () => {
    expect(markupOf(fixture)).not.toContain('EPM-BIL-042');
  });

  it('never shows the raw body', () => {
    for (const fragment of ['traceId', UNMAPPED_CODE_PROBLEM.traceId, '{', 'https://errors.epm']) {
      expect(markupOf(fixture)).not.toContain(String(fragment));
    }
  });

  it('never shows the developer-facing title', () => {
    expect(markupOf(fixture).toLowerCase()).not.toContain(
      String(UNMAPPED_CODE_PROBLEM.title).toLowerCase(),
    );
  });

  it('logs the code it could not word', () => {
    // The reader is told something sensible and learns nothing; this is how anyone
    // else finds out the server has started sending a code this build does not know.
    const warn = vi.mocked(console.warn);

    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.map(String).join('\n')).toContain('EPM-BIL-042');
  });

  it('logs the body for a developer, including the title and the traceId', () => {
    expect(console.error).toHaveBeenCalledWith(
      '[error] EPM-BIL-042',
      expect.objectContaining({
        title: UNMAPPED_CODE_PROBLEM.title,
        traceId: UNMAPPED_CODE_PROBLEM.traceId,
      }),
    );
  });
});

describe('a known code', () => {
  it('is not reported as missing wording', async () => {
    await render(PROBLEM_FIXTURES['EPM-ORG-006'], 'en');

    // The unknown-code warning is worth having only if it stays quiet the rest of the
    // time; a log line that appears for every error is a log line nobody reads.
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('is still logged for whoever has to explain it', async () => {
    const problem = PROBLEM_FIXTURES['EPM-ORG-006'];

    await render(problem, 'en');

    expect(console.error).toHaveBeenCalledWith(
      '[error] EPM-ORG-006',
      expect.objectContaining({ title: problem.title, traceId: problem.traceId, status: 422 }),
    );
  });
});

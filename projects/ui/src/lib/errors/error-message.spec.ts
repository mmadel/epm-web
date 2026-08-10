import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LANGUAGE_STORAGE } from 'core';

import { TRANSLATIONS } from '../i18n/translations';
import { UNKNOWN_ERROR_MESSAGE_KEY } from './error-message-keys';
import { ErrorMessage } from './error-message';
import { UNMAPPED_CODE_PROBLEM } from './problem.fixture';

const UNFAMILIAR = UNMAPPED_CODE_PROBLEM;

describe('ErrorMessage, given a code this build has never heard of', () => {
  let fixture: ComponentFixture<ErrorMessage>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
  }

  function markup(): string {
    return (fixture.nativeElement as HTMLElement).innerHTML;
  }

  beforeEach(async () => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      // No storage: a language chosen in one test must not be remembered by the next.
      providers: [{ provide: LANGUAGE_STORAGE, useValue: null }],
    });

    fixture = TestBed.createComponent(ErrorMessage);
    fixture.componentRef.setInput('problem', UNFAMILIAR);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the generic message', () => {
    expect(text()).toBe(TRANSLATIONS.en[UNKNOWN_ERROR_MESSAGE_KEY]);
  });

  it('shows something', () => {
    // Stated separately from the assertion above so that this survives a rewording of
    // the generic message. A blank screen is the failure this subtask exists to stop.
    expect(text().length).toBeGreaterThan(0);
  });

  it('never renders the translation key', () => {
    // The trap this subtask is really about. TranslationService renders an unknown key
    // as the key itself - right for a key a developer typed, catastrophic for a code
    // that arrived over the network - so the fallback to a key that exists has to
    // happen in the registry lookup, before translation is asked anything. If it were
    // to happen after, this would read "errors.unknown.EPM-BIL-042".
    expect(markup()).not.toContain('errors.');
  });

  it('never shows the raw code', () => {
    expect(markup()).not.toContain('EPM-BIL-042');
  });

  it('never shows the raw body', () => {
    for (const fragment of ['traceId', UNFAMILIAR.traceId, '{', 'https://errors.epm']) {
      expect(markup()).not.toContain(String(fragment));
    }
  });

  it('never shows the developer-facing title', () => {
    expect(markup().toLowerCase()).not.toContain(String(UNFAMILIAR.title).toLowerCase());
  });

  it('logs the code it could not word', () => {
    // The reader is told something sensible and learns nothing; this is how anyone
    // else finds out the server has started sending a code this build does not know.
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.map(String).join('\n')).toContain('EPM-BIL-042');
  });

  it('logs the body for a developer, including the title and the traceId', () => {
    expect(error).toHaveBeenCalledWith(
      '[error] EPM-BIL-042',
      expect.objectContaining({ title: UNFAMILIAR.title, traceId: UNFAMILIAR.traceId }),
    );
  });
});

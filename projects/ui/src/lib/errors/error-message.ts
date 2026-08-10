import { Component, computed, effect, input } from '@angular/core';

import { TranslatePipe } from '../i18n/translate-pipe';
import { TranslationParams } from '../i18n/translation-service';
import { errorMessageKey, lookUpErrorMessageKey } from './error-message-keys';
import { ProblemDetails } from './problem';

/**
 * The members every problem+json body has, whatever the code.
 *
 * Everything else in the body is a fact about this particular failure, and those facts
 * are the message's inputs: `EPM-ORG-006` carries `limit` and `requested`, and its
 * wording names both. Excluding these five is what makes "the extras" a set the
 * translations can rely on without listing them per code.
 *
 * It is also the second lock on `title`. The first is that no template renders it; this
 * one is that it is never handed to the translator either, so a `{title}` written into
 * a translation by mistake resolves to nothing and cannot leak a server-side log line
 * onto the screen.
 */
const STANDARD_MEMBERS: readonly string[] = ['type', 'title', 'status', 'code', 'traceId'];

/**
 * The facts behind the failure, in the shape the translator interpolates.
 *
 * Values that are neither a string nor a number are dropped rather than stringified: a
 * nested object would render as `[object Object]` in the middle of a sentence, and an
 * unfilled `{placeholder}` left visible is a bug someone reports (see
 * `TranslationService`), whereas `[object Object]` is one they screenshot.
 */
function messageFields(problem: ProblemDetails): TranslationParams {
  const fields: Record<string, string | number> = {};

  for (const [name, value] of Object.entries(problem)) {
    if (STANDARD_MEMBERS.includes(name)) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      fields[name] = value;
    }
  }

  return fields;
}

/**
 * Shows one failed request to the person who caused it.
 *
 * It is given the problem+json body exactly as the API sent it and works out the
 * wording itself, because the body deliberately contains none: the server sends a code
 * and facts, this component owns the sentence. Callers therefore hand over the response
 * and are done - there is no wording, no formatting and no error taxonomy in any
 * feature that reports a failure.
 *
 * The facts the body carries beyond the standard members are the message's inputs:
 * `EPM-ORG-006` arrives with `limit` and `requested`, and its wording names both
 * numbers so the reader can see how far over they are without counting staff.
 *
 * Two members of that body never reach the screen:
 *
 * - `title` is a developer's summary of the fault, written server-side, English-only.
 *   It is not rendered anywhere - not as a heading, not as a tooltip, not as an
 *   `aria-label`, not in a `title` attribute. It is written to the console instead,
 *   where the person it was written for will see it.
 * - `traceId` identifies the server-side log entry. Showing it invites someone to read
 *   a UUID down a phone line; logging it means we can look the request up ourselves.
 *
 * `role="alert"` announces the message when it appears, which is the point of showing
 * it: the reader has just pressed a button and needs to know it did not work.
 */
@Component({
  selector: 'lib-error-message',
  imports: [TranslatePipe],
  template: `
    <p class="error-message" role="alert">{{ messageKey() | translate: messageFields() }}</p>
  `,
})
export class ErrorMessage {
  /** The problem+json body, straight from the response. */
  readonly problem = input.required<ProblemDetails>();

  /**
   * The wording for this code, from the one table that maps codes to wording.
   *
   * Always a key that exists: an unfamiliar code resolves to the generic message
   * rather than to nothing, so there is no state in which this component shows a blank
   * space, the raw body, or the code itself.
   */
  protected readonly messageKey = computed(() => errorMessageKey(this.problem().code));

  /**
   * The extra fields this body carries, ready to fill the `{placeholders}` in it.
   *
   * Passed for every code, not only the codes whose wording uses them: a translation
   * that starts naming a field the server already sends then needs no code change, and
   * an unused field costs a property lookup that never happens.
   */
  protected readonly messageFields = computed(() => messageFields(this.problem()));

  constructor() {
    // One line per problem shown, for whoever has to explain it later. This is where
    // `title` and `traceId` belong: `title` is already written for a developer reading
    // a log, and `traceId` is the handle on the server-side record of this exact
    // request. Neither is any use to the reader of the message above.
    effect(() => {
      const problem = this.problem();

      console.error(`[error] ${problem.code}`, {
        status: problem.status,
        title: problem.title,
        traceId: problem.traceId,
      });

      // The reader is shown the generic message and is none the wiser, which is the
      // correct outcome for them and a useless one for us - so the code says so here.
      // Seeing this in a log is how anyone finds out the server has started sending
      // something this build has no wording for.
      if (lookUpErrorMessageKey(problem.code) === undefined) {
        console.warn(
          `[error] No wording for code "${problem.code}"; showed the generic message. ` +
            'Add a row to ERROR_MESSAGE_KEYS and a string to errors.en.ts / errors.ar.ts.',
        );
      }
    });
  }
}

import { Component, computed, effect, input } from '@angular/core';

import { TranslatePipe } from '../i18n/translate-pipe';
import { lookUpErrorMessageKey } from './error-message-keys';
import { ProblemDetails } from './problem';

/**
 * Shows one failed request to the person who caused it.
 *
 * It is given the problem+json body exactly as the API sent it and works out the
 * wording itself, because the body deliberately contains none: the server sends a code
 * and facts, this component owns the sentence. Callers therefore hand over the response
 * and are done - there is no wording, no formatting and no error taxonomy in any
 * feature that reports a failure.
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
    @if (messageKey(); as key) {
      <p class="error-message" role="alert">{{ key | translate }}</p>
    }
  `,
})
export class ErrorMessage {
  /** The problem+json body, straight from the response. */
  readonly problem = input.required<ProblemDetails>();

  /** The wording for this code, from the one table that maps codes to wording. */
  protected readonly messageKey = computed(() => lookUpErrorMessageKey(this.problem().code));

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
    });
  }
}

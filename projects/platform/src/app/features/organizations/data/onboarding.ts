import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  OnboardOrganizationRequest,
  OnboardOrganizationResponse,
  PlatformOnboardingService,
} from 'api-client';
import { ProblemDetails } from 'ui';

/**
 * Where a submission has got to.
 *
 * `rejected` and `unreachable` are separated because the screen owes the reader
 * different things in each. A rejection is an answer: the server read the request,
 * refused it, and named a code that points at a field. Unreachable is not an
 * answer at all - nothing is known about whether anything was created, which is
 * exactly the case the idempotency key exists for, and the only honest thing to
 * say is "try again".
 */
export type Submission =
  | { readonly kind: 'editing' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'created'; readonly created: OnboardOrganizationResponse }
  | { readonly kind: 'rejected'; readonly problem: ProblemDetails }
  | { readonly kind: 'unreachable' };

/**
 * The one call that creates a practice, and everything the screen knows about it.
 *
 * THE IDEMPOTENCY KEY IS THE POINT OF THIS SERVICE. It is claimed when submit is
 * first pressed, kept through every retry of that submission, and thrown away only
 * when the reader starts a new practice (T-64 §5). A key regenerated on retry
 * creates a SECOND practice - with a second subscription, and a second set of
 * staff - and nothing on screen would say so; the first attempt that timed out may
 * well have succeeded server-side, which is the whole reason the header exists.
 *
 * `POST` answers 201 the first time and 200 to a repeat of the same key with the
 * same body. Both are successes carrying the same response, so neither this
 * service nor the screen branches on the status code: the generated client hands
 * back a body either way, and a reader who pressed the button twice sees the
 * practice they created rather than a warning about how they got there.
 */
@Injectable({ providedIn: 'root' })
export class Onboarding {
  private readonly onboarding = inject(PlatformOnboardingService);

  /** Null until the first submit of the current practice claims one. */
  private readonly key = signal<string | null>(null);

  private readonly state = signal<Submission>({ kind: 'editing' });

  readonly submission = this.state.asReadonly();

  /**
   * Sends the request, or does nothing if one is already in flight.
   *
   * The guard is what makes "exactly one request" true rather than merely likely
   * (T-64 §7.1): the submit control is disabled while submitting, but a disabled
   * button is a rendering, and a double press, an Enter key on a form, and a test
   * calling this twice all reach here without one.
   */
  submit(request: OnboardOrganizationRequest): void {
    if (this.state().kind === 'submitting') {
      return;
    }

    // Claimed once and reused for every retry of THIS practice. `??` rather than a
    // fresh value is the whole of criteria 5 and 6.
    const idempotencyKey = this.key() ?? this.claimKey();

    this.state.set({ kind: 'submitting' });

    this.onboarding.onboardOrganization(idempotencyKey, request).subscribe({
      next: (created) => this.state.set({ kind: 'created', created }),
      error: (failure: unknown) => this.state.set(readFailure(failure)),
    });
  }

  /**
   * Ends this submission and starts a new practice.
   *
   * Dropping the key here, and only here, is what makes the next practice a
   * different one. The draft is cleared by the screen in the same action.
   */
  startAnother(): void {
    this.key.set(null);
    this.state.set({ kind: 'editing' });
  }

  private claimKey(): string {
    const claimed = crypto.randomUUID();
    this.key.set(claimed);

    return claimed;
  }
}

/**
 * What a failed call was.
 *
 * A body is only treated as a problem when it actually carries a `code`, because
 * that is the member every message on the screen is chosen by. A 502 from a proxy
 * answers with HTML, a dropped connection answers with nothing at all, and neither
 * can be shown as a coded failure - they are the same "we do not know" the network
 * case is.
 */
function readFailure(failure: unknown): Submission {
  const body = failure instanceof HttpErrorResponse ? failure.error : undefined;

  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ProblemDetails).code === 'string'
  ) {
    return { kind: 'rejected', problem: body as ProblemDetails };
  }

  return { kind: 'unreachable' };
}

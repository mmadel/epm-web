import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PlatformOrganization, PlatformPracticesService } from 'api-client';

/**
 * Why one practice could not be read.
 *
 * THE THREE ARE DIFFERENT ANSWERS AND THE SCREEN OWES A DIFFERENT SENTENCE FOR
 * EACH. `missing` is a practice that is not there - a deleted bookmark, or an id
 * from another environment - and the reader should stop looking for it. `malformed`
 * is an id that is not a UUID, which the route answers 400 to rather than 404
 * because the request was not understood (`LLD-ORGANIZATION.md` §2.8); it is a typo
 * in the address, not a missing practice. `unreachable` is everything else, and it
 * is the only one of the three worth retrying.
 */
export type Failure = 'missing' | 'malformed' | 'unreachable';

/**
 * One practice's registration, for the screen that reads it.
 *
 * WHAT THE ROUTE ANSWERS WITH IS THE WHOLE BOUNDARY. `LLD-ORGANIZATION.md` §2.8:
 * the practice's name, its own status, when it was onboarded, every branch it has -
 * active and inactive - and its subscription with both limits and both usage
 * figures. And then: "No staff member appears, in any form: no name, no email
 * address, no phone number, nothing clinical." The screen renders this response and
 * never enriches it, which is what keeps that sentence true.
 *
 * THE USAGE FIGURES COUNT ACTIVE ROWS AND THE BRANCH LIST CARRIES EVERY BRANCH, so
 * a practice with three branches of which one is inactive reads `2 of 5 branches`
 * over a list of three. That is not a defect and the screen says so in words - see
 * the note under the branch list - because it is exactly the kind of mismatch that
 * gets reported as one.
 */
@Injectable({ providedIn: 'root' })
export class Practice {
  private readonly practices = inject(PlatformPracticesService);

  /** `undefined` until a screen says which practice. An idle resource calls nothing. */
  private readonly id = signal<string | undefined>(undefined);

  private readonly asked = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.practices.getOrganizationById(params),
  });

  /**
   * The practice, or `undefined` while it is on its way or after it failed.
   *
   * Nothing is held from the previous practice here, deliberately - unlike the
   * list, which keeps the page on screen while the next one loads. Opening practice
   * B and being shown practice A's branches for a moment is worse than a blank
   * screen, because a blank screen cannot be misread as an answer.
   */
  readonly practice = computed<PlatformOrganization | undefined>(() =>
    // `hasValue()` before `value()`: a resource in an error state THROWS from
    // `value()`, which would put the failure inside change detection and take the
    // whole screen down - including the retry the reader needs.
    this.asked.hasValue() ? this.asked.value() : undefined,
  );

  readonly isLoading = this.asked.isLoading;

  /** Why it failed, or `undefined` if it has not. */
  readonly failure = computed<Failure | undefined>(() => {
    const error = this.asked.error();

    if (error === undefined) {
      return undefined;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'missing';
      }

      if (error.status === 400) {
        return 'malformed';
      }
    }

    return 'unreachable';
  });

  /** Reads a practice. Calling it with the id already on screen changes nothing. */
  show(id: string): void {
    this.id.update((current) => (current === id ? current : id));
  }

  /**
   * Puts a practice the server has just answered with in place of the one held.
   *
   * The write routes reply with the same body this one reads (`LLD-ORGANIZATION.md`
   * §2.2), so a screen that has just saved already has the practice and does not
   * need to ask for it again. Re-reading would not only cost a round trip: it is a
   * second chance to show something other than what was just saved, which is the
   * one thing a reader would not expect to see after pressing Save.
   */
  accept(practice: PlatformOrganization): void {
    this.asked.set(practice);
  }

  retry(): void {
    this.asked.reload();
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { PlatformOrganization, PlatformPracticesService, Problem } from 'api-client';

/**
 * Where an edit has got to.
 *
 * `rejected` and `unreachable` are separated for the same reason they are in
 * `Onboarding`: a rejection is an answer - the server read the request, refused it,
 * and named a code - while unreachable is not an answer at all. Nothing is known
 * about whether the name changed, and the only honest thing to say is "try again".
 *
 * `saved` carries the practice the server answered with rather than a flag, because
 * that body is what the screen then shows. See the note on `save` below.
 */
export type Update =
  | { readonly kind: 'editing' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly practice: PlatformOrganization }
  | { readonly kind: 'missing' }
  | { readonly kind: 'rejected'; readonly problem: Problem }
  | { readonly kind: 'unreachable' };

/**
 * The one call that changes a practice after it has been created.
 *
 * `PATCH /platform/organizations/{id}` - `updateOrganizationFromPlatform`, which
 * arrived in `@mmadel/openapi-spec@0.2.0` and is the route this screen spent the
 * whole of F1 without.
 *
 * IT CHANGES THE NAME AND NOTHING ELSE, and the body below is built one member at a
 * time to keep that true. The generated `UpdateOrganizationRequest` also carries
 * `status` as an optional member, so `{ name, status }` COMPILES - and is 422
 * EPM-ORG-007 at runtime whatever the value, because a practice's status moves
 * through `suspendOrganization`, `reopenOrganization` and `closeOrganization`, each
 * with its own precondition. Spreading a form object in here is therefore the one
 * change that would break this quietly, and it is why the request is written out
 * rather than assembled from whatever the screen happens to hold. There is no
 * member for the plan at all: no route changes a practice's plan.
 *
 * THERE IS NO IDEMPOTENCY KEY AND IT IS NOT AN OVERSIGHT. `Onboarding` claims one
 * because a repeated POST would create a second practice; this is a PATCH that sets
 * a name to a value, so sending it twice leaves the practice in the state the second
 * one asked for. A retry after a timeout is safe here in the way it is not there.
 *
 * THE ANSWER IS THE PRACTICE. The route replies with the same body as
 * `getOrganizationById`, so the screen replaces what it is holding from the response
 * rather than reading the practice a second time - see `Practice.accept`. A second
 * read would also be a second chance to show something different from what was just
 * saved.
 */
@Injectable({ providedIn: 'root' })
export class PracticeUpdate {
  private readonly practices = inject(PlatformPracticesService);

  private readonly state = signal<Update>({ kind: 'editing' });

  readonly progress = this.state.asReadonly();

  /**
   * Sends the new name, or does nothing if a save is already in flight.
   *
   * The guard is what makes "one request per press" true rather than merely likely:
   * the submit is disabled while saving, but a disabled button is a rendering, and a
   * double press, an Enter on the form and a test calling this twice all arrive here
   * without going near it.
   */
  save(id: string, name: string): void {
    if (this.state().kind === 'saving') {
      return;
    }

    this.state.set({ kind: 'saving' });

    // One member, written out. See the class note: `status` compiles and is 422.
    this.practices.updateOrganizationFromPlatform(id, { name }).subscribe({
      next: (practice) => this.state.set({ kind: 'saved', practice }),
      error: (failure: unknown) => this.state.set(readFailure(failure)),
    });
  }

  /**
   * Back to editing, dropping whatever the last save said.
   *
   * The screen calls this when the reader types again: a message about the save
   * that finished a minute ago, sitting above fields that have changed since, is
   * describing a practice that no longer matches what is on screen.
   */
  editing(): void {
    const kind = this.state().kind;

    // Not while a save is in flight - that answer is still coming and is still the
    // reader's to see. And not when it is already editing: this runs on every
    // keystroke, and a fresh object each time is a signal change each time.
    if (kind !== 'saving' && kind !== 'editing') {
      this.state.set({ kind: 'editing' });
    }
  }
}

/**
 * What a failed call was.
 *
 * A body counts as a problem only when it actually carries a `code`, because that is
 * the member every message is chosen by. A 502 from a proxy answers with HTML and a
 * dropped connection answers with nothing; neither can be shown as a coded refusal,
 * and both are the same "we do not know" as the network case.
 */
function readFailure(failure: unknown): Update {
  // A practice that is not there is read from the status rather than from a code,
  // the way `Practice` reads it: the specification describes the responses, not the
  // codes inside them, and this build has not seen the code for it. The status says
  // enough, and the reader is owed a different sentence for it than for a refusal.
  if (failure instanceof HttpErrorResponse && failure.status === 404) {
    return { kind: 'missing' };
  }

  const body = failure instanceof HttpErrorResponse ? failure.error : undefined;

  if (typeof body === 'object' && body !== null && typeof (body as Problem).code === 'string') {
    return { kind: 'rejected', problem: body as Problem };
  }

  return { kind: 'unreachable' };
}

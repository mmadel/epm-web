import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { OnboardOrganizationResponse } from 'api-client';

/** How the last copy went, for the row it was pressed on. */
interface CopyOutcome {
  readonly id: string;
  readonly label: string;
  readonly ok: boolean;
}

/** How long a row keeps saying "Copied" before going quiet again. */
const CONFIRMATION_MS = 2500;

/**
 * What was created, with every id the server issued.
 *
 * IT REPLACES THE FORM RATHER THAN JOINING IT. The practice exists; a filled-in
 * form left beside this panel is an invitation to press create again, which is the
 * one thing this screen must not make easy.
 *
 * A 201 and a 200 both arrive here and are rendered identically (criterion 4). A
 * 200 means the key has been seen before - the reader pressed create twice, or a
 * retry followed a request that had in fact succeeded - and the practice they are
 * looking at is theirs either way. Telling them "this already existed" would
 * describe a mechanism rather than their practice.
 *
 * It is a component of its own rather than a block in the page for the ordinary
 * reason: it is a second screen the same route shows, with nothing in common with
 * the form's markup or its styling.
 *
 * IT IS A RECEIPT, NOT A CELEBRATION. The reader has spent the whole form beside a
 * sticky ledger headed "Will be created", ending "Nothing exists until the last
 * step". This is that ledger's answer, and it is deliberately built from the same
 * pieces in the past tense - the same uppercase labels, the same counts, the same
 * list rhythm - so the screen they land on is the one they have been reading all
 * along. What it adds is the identifiers, because handing those over is the whole
 * reason the panel exists: they are what another system, a support thread or the
 * backend will ask for, and nobody can regenerate them from this screen.
 */
@Component({
  selector: 'app-created-panel',
  templateUrl: './created-panel.html',
  styleUrl: './created-panel.scss',
})
export class CreatedPanel {
  /** The response, exactly as the API sent it. */
  readonly created = input.required<OnboardOrganizationResponse>();

  /**
   * What the practice was called, from the draft.
   *
   * Taken from the form rather than from the response, because the response does
   * not carry it - and re-fetching a practice to print its own name back at the
   * person who just typed it would be a request made to avoid an input.
   */
  readonly practiceName = input<string>('');

  readonly another = output<void>();

  readonly branches = computed(() => this.created().clinics ?? []);
  readonly staff = computed(() => this.created().staff ?? []);

  private readonly outcome = signal<CopyOutcome | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  /**
   * What a screen reader is told, and the only place the result of a copy is
   * worded. The buttons keep a fixed accessible name: a control whose name changes
   * under the pointer is a control that has been renamed mid-press, and "Copied"
   * as a button name no longer says what pressing it does.
   */
  readonly status = computed(() => {
    const outcome = this.outcome();

    if (outcome === null) {
      return '';
    }

    return outcome.ok
      ? `${outcome.label} id copied.`
      : `${outcome.label} id could not be copied. Select it and copy it manually.`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /** `Copy`, `Copied` or `Couldn't copy` - the word this row's button shows. */
  copyLabel(id: string | undefined): string {
    const outcome = this.outcome();

    if (outcome === null || outcome.id !== id) {
      return 'Copy';
    }

    return outcome.ok ? 'Copied' : "Couldn't copy";
  }

  copied(id: string | undefined): boolean {
    const outcome = this.outcome();

    return outcome !== null && outcome.id === id && outcome.ok;
  }

  async copy(id: string | undefined, label: string): Promise<void> {
    if (!id) {
      return;
    }

    try {
      // Reached through `navigator` rather than a wrapper: the API is one call, and
      // it is absent on an insecure origin, which the catch below already covers.
      await navigator.clipboard.writeText(id);
      this.confirm({ id, label, ok: true });
    } catch {
      // A refusal is not a dead end - the id stays selectable, and `status` says so.
      // Swallowing it silently would leave a button that looks like it worked.
      this.confirm({ id, label, ok: false });
    }
  }

  private confirm(outcome: CopyOutcome): void {
    clearTimeout(this.timer);
    this.outcome.set(outcome);
    // It goes quiet again on its own. A row left saying "Copied" for the rest of the
    // session stops meaning "just now", which is the only thing it was saying.
    this.timer = setTimeout(() => this.outcome.set(null), CONFIRMATION_MS);
  }
}

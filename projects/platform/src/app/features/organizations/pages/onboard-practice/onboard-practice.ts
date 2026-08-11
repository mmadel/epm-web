import { Component, computed, ElementRef, inject, signal } from '@angular/core';

import { PageHeader } from '../../../../layout/page-header';
import { BranchForm, BranchValues } from '../../components/branch-form/branch-form';
import { Ledger } from '../../components/ledger/ledger';
import { StaffForm, StaffValues } from '../../components/staff-form/staff-form';
import { Step, StepState } from '../../components/step/step';
import { OrganizationDraft } from '../../organization-draft';
import { PLAN_OPTIONS } from '../../organization-vocabulary';

/** The four steps, in order. */
const PRACTICE = 1;
const BRANCHES = 2;
const STAFF = 3;
const REVIEW = 4;
const LAST = REVIEW;

/**
 * Creating a whole organization: a practice, its branches, its staff, and the one
 * call that makes all three.
 *
 * A VERTICAL PROGRESS FLOW ON ONE PAGE. Two shapes were tried here and thrown
 * away, and the reasons are what this one is built out of:
 *
 * - A tab strip gave random access to four screens and no sense of progress. It
 *   never said where you were, what was left, or what was finished, and it hid
 *   fields from the server errors that name them (P-05.7).
 * - A single flat form fixed the hiding and lost the guidance: a practice, its
 *   branches AND its staff on one undivided page is a wall, and nothing in it says
 *   what to do first.
 *
 * This keeps both. There is always exactly one thing to do next and a bar that
 * says how far along it is, AND every step stays on the page - finished ones
 * collapsed to a line that says what is in them. Nothing is behind a click that
 * cannot be opened in place, which is what will let an error open the step that
 * owns its field instead of pointing off screen.
 *
 * THE STEPS ARE NOT ROUTES. Four addresses for one form put four entries in the
 * browser's history, and Back would then mean "undo one step of a form I have not
 * submitted" - which it does not. The draft outlives all of this in
 * `OrganizationDraft` either way.
 *
 * The controls are bound by hand rather than through `ReactiveFormsModule`. The
 * validation this console needs is P-05's - field rules, and the server's error
 * codes mapped back onto the field each one names - and standing up a form group
 * now would mean building it twice.
 */
@Component({
  selector: 'app-onboard-practice',
  imports: [PageHeader, Step, Ledger, BranchForm, StaffForm],
  templateUrl: './onboard-practice.html',
  styleUrl: './onboard-practice.scss',
})
export class OnboardPractice {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly draft = inject(OrganizationDraft);
  protected readonly plans = PLAN_OPTIONS;

  // ---------------------------------------------------------------------------
  // Which form, if any, is open
  // ---------------------------------------------------------------------------

  // A LIST AND A FORM, NOT A LIST OF FORMS. Each list shows what is on the draft;
  // adding or editing opens one form, which holds its own values and reaches the
  // draft only when it is submitted. At most one is open at a time in each list -
  // two open forms is two half-finished things and no way to tell which the reader
  // meant.

  protected readonly addingBranch = signal(false);
  protected readonly editingBranch = signal<string | null>(null);
  protected readonly addingStaff = signal(false);
  protected readonly editingStaff = signal<string | null>(null);

  protected readonly steps = {
    practice: PRACTICE,
    branches: BRANCHES,
    staff: STAFF,
    review: REVIEW,
  };

  /**
   * The flow, for the meter at the top.
   *
   * The titles are here rather than only in the template so the meter and the steps
   * cannot end up naming them differently - the meter is a map of the same four
   * things, and a map that disagrees with the territory is worse than no map.
   */
  protected readonly flow = [
    { number: PRACTICE, title: 'Practice' },
    { number: BRANCHES, title: 'Branches' },
    { number: STAFF, title: 'Staff' },
    { number: REVIEW, title: 'Review' },
  ] as const;

  /** Which step is open. Exactly one is, always. */
  protected readonly openStep = signal(PRACTICE);

  /**
   * The furthest step the reader has actually opened.
   *
   * IT IS NOT DERIVABLE FROM COMPLETENESS, and assuming it was put a tick and an
   * `Edit` link beside `Staff` and `Review and create` on a blank form: the staff
   * step is complete with nobody in it, so a step that had never been seen
   * reported itself finished. A step is done when it has been REACHED and is
   * complete; nothing else counts.
   */
  private readonly furthest = signal(PRACTICE);

  /**
   * Whether each step is finished, by number.
   *
   * The review step is finished when everything before it is: there is nothing to
   * fill in on it, and it is only "done" in the sense that there is nothing left
   * to stop the call.
   */
  private readonly completion = computed<Record<number, boolean>>(() => ({
    [PRACTICE]: this.draft.practiceIsComplete(),
    [BRANCHES]: this.draft.branchesAreComplete(),
    [STAFF]: this.draft.staffAreComplete(),
    [REVIEW]: this.draft.isComplete(),
  }));

  /**
   * How many steps are behind the reader, out of four.
   *
   * FINISHED **AND** REACHED, which is not the same as finished. The staff step is
   * complete with nobody in it - a practice can be created without staff - so a bar
   * counting completeness alone reads 3 of 4 on a blank page, having credited the
   * reader for a step they have not seen. It counts what is done up to where they
   * are, and it still cannot claim a step they opened and left empty.
   */
  protected readonly progress = computed(
    () =>
      [PRACTICE, BRANCHES, STAFF, REVIEW].filter(
        (step) => step <= this.furthest() && this.completion()[step],
      ).length,
  );

  protected readonly total = LAST;

  protected state(step: number): StepState {
    if (this.openStep() === step) {
      return 'current';
    }

    return step <= this.furthest() && this.completion()[step] ? 'done' : 'upcoming';
  }

  /**
   * Whether a step can be opened: every step before it is finished.
   *
   * A step is never locked because of what is in it - only because of what is not
   * yet in the ones above. Going BACK is always allowed, which is why a finished
   * step reopens however far along the reader is.
   */
  protected isLocked(step: number): boolean {
    return [PRACTICE, BRANCHES, STAFF]
      .filter((earlier) => earlier < step)
      .some((earlier) => !this.completion()[earlier]);
  }

  protected isComplete(step: number): boolean {
    return this.completion()[step];
  }

  protected toggle(step: number): void {
    // Pressing the open step's own heading collapses nothing: one step is always
    // open, and a page with all four closed is a page with nothing to do on it.
    if (step !== this.openStep()) {
      this.open(step);
    }
  }

  protected continueFrom(step: number): void {
    this.open(Math.min(step + 1, LAST));
  }

  /** Which of the branches this staff member works at, for the review. */
  protected branchesOf(staffKey: string): string {
    const member = this.draft.staff().find((row) => row.key === staffKey);

    return this.draft
      .branches()
      .filter((branch) => member?.branchKeys.includes(branch.key))
      .map((branch, at) => branch.name || `Branch ${at + 1}`)
      .join(', ');
  }

  /** Everyone at this branch, for the review - the direction the form cannot answer. */
  protected staffAt(branchKey: string): string {
    return this.draft
      .staff()
      .filter((member) => member.branchKeys.includes(branchKey))
      .map((member, at) => member.fullName || `Staff member ${at + 1}`)
      .join(', ');
  }

  // ---------------------------------------------------------------------------
  // The summaries a finished step collapses to
  // ---------------------------------------------------------------------------

  // They say what was entered rather than how much of it there was: a reader
  // checking their work against a line reading "3 branches" learns nothing.

  protected readonly practiceSummary = computed(() =>
    [this.draft.name().trim(), this.draft.plan()].filter(Boolean).join(' · '),
  );

  protected readonly branchesSummary = computed(() => {
    const named = this.draft
      .branches()
      .map((branch, at) => branch.name.trim() || `Branch ${at + 1}`);

    return named.length === 0 ? '' : `${named.length} · ${named.join(', ')}`;
  });

  protected readonly staffSummary = computed(() => {
    const named = this.draft
      .staff()
      .map((member, at) => member.fullName.trim() || `Staff member ${at + 1}`);

    return named.length === 0
      ? 'None — they can be added later'
      : `${named.length} · ${named.join(', ')}`;
  });

  // ---------------------------------------------------------------------------
  // Fields
  // ---------------------------------------------------------------------------

  protected onName(event: Event): void {
    this.draft.setName((event.target as HTMLInputElement).value);
  }

  /**
   * Chooses a plan.
   *
   * The plan is a set of three with a sentence each, so it renders as cards over
   * the full set rather than as a `select`: a dropdown hides two thirds of a
   * decision that costs money to get wrong, and there is nowhere in a dropdown to
   * put the sentence that says which one is which.
   */
  protected choosePlan(plan: string): void {
    this.draft.setPlan(plan);
  }

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------

  protected startAddBranch(): void {
    this.editingBranch.set(null);
    this.addingBranch.set(true);
  }

  protected startEditBranch(key: string): void {
    this.addingBranch.set(false);
    this.editingBranch.set(key);
  }

  protected closeBranchForm(): void {
    this.addingBranch.set(false);
    this.editingBranch.set(null);
  }

  /**
   * Appends a branch and fills it in one go.
   *
   * The draft learns about it only here, which is why the list never contains a
   * row somebody started and abandoned.
   */
  protected addBranch(values: BranchValues): void {
    this.draft.setBranch(this.draft.addBranchEntry(), values);
    this.closeBranchForm();
  }

  protected saveBranch(key: string, values: BranchValues): void {
    this.draft.setBranch(key, values);
    this.closeBranchForm();
  }

  // ---------------------------------------------------------------------------
  // Staff
  // ---------------------------------------------------------------------------

  protected startAddStaff(): void {
    this.editingStaff.set(null);
    this.addingStaff.set(true);
  }

  protected startEditStaff(key: string): void {
    this.addingStaff.set(false);
    this.editingStaff.set(key);
  }

  protected closeStaffForm(): void {
    this.addingStaff.set(false);
    this.editingStaff.set(null);
  }

  protected addStaff(values: StaffValues): void {
    this.draft.setStaff(this.draft.addStaffEntry(), values);
    this.closeStaffForm();
  }

  protected saveStaff(key: string, values: StaffValues): void {
    this.draft.setStaff(key, values);
    this.closeStaffForm();
  }

  /**
   * Opens a step and moves focus into it.
   *
   * Without the focus move, pressing Continue at the foot of one step leaves a
   * keyboard reader's focus at the bottom of a panel that has just closed, and a
   * screen-reader user hears nothing at all - the page changed somewhere they are
   * not. The panel is focused rather than its first field, so what is read out is
   * the step they arrived at and not a lone label.
   */
  private open(step: number): void {
    this.openStep.set(step);
    this.furthest.update((furthest) => Math.max(furthest, step));

    // The panel it names does not exist until the view has caught up with the
    // signal, so this waits a frame rather than reaching for it now.
    requestAnimationFrame(() => {
      (this.host.nativeElement as HTMLElement)
        .querySelector<HTMLElement>(`#step-panel-${step}`)
        ?.focus();
    });
  }
}

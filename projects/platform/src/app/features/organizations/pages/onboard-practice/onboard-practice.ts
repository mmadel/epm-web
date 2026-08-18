import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';

import { PageHeader } from 'ui';

import { routeTitle } from '../../../../layout/route-title';
import { BranchForm, BranchValues } from '../../components/branch-form/branch-form';
import { Dialog } from '../../components/dialog/dialog';
import { CreatedPanel } from '../../components/created-panel/created-panel';
import { Ledger } from '../../components/ledger/ledger';
import { PlanChoice } from '../../components/plan-choice/plan-choice';
import { Review } from '../../components/review/review';
import { StaffForm, StaffValues } from '../../components/staff-form/staff-form';
import { Step, StepState } from '../../components/step/step';
import { onboardRequestFrom } from '../../data/onboard-request';
import { Onboarding } from '../../data/onboarding';
import { Plans } from '../../data/plans';
import { faultFrom } from '../../data/server-faults';
import { Fault, FaultField, FaultRegion, faultsIn } from '../../faults';
import { OrganizationDraft } from '../../organization-draft';
import { branchesOf, counted, rolesOf, staffAt } from '../../organization-summary';

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
  imports: [
    PageHeader,
    Step,
    Ledger,
    PlanChoice,
    Review,
    Dialog,
    BranchForm,
    StaffForm,
    CreatedPanel,
  ],
  templateUrl: './onboard-practice.html',
  styleUrl: './onboard-practice.scss',
})
export class OnboardPractice {
  /**
   * The screen's heading, taken from the route so that the browser tab and the page
   * cannot disagree - see `routeTitle`. It is passed to `lib-page-header` rather
   * than read inside it, because that component is shared with a console that has no
   * route titles at all.
   */
  protected readonly title = routeTitle();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  protected readonly draft = inject(OrganizationDraft);
  protected readonly plans = inject(Plans);
  protected readonly onboarding = inject(Onboarding);

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

  constructor() {
    // THE SERVER'S ANSWER, PUT WHERE IT BELONGS. A refusal names a code, the code
    // names a control (§4), and the reader is taken to it - which is the difference
    // between "something was wrong" and a form they can finish.
    //
    // The mapping runs `untracked` because it reads the draft to find the row the
    // server meant. Tracked, this effect would re-run on every keystroke that
    // followed and drag focus back to the fault each time, which is the behaviour
    // of a form nobody can escape.
    effect(() => {
      const submission = this.onboarding.submission();

      untracked(() => {
        if (submission.kind !== 'rejected') {
          return;
        }

        const fault = faultFrom(submission.problem, this.draft);

        this.faults.set([fault]);
        this.reveal(fault);
      });
    });
  }

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

  // The three read-models the lists are built from live in `organization-summary.ts`,
  // because the review asks the same three questions of the same draft. These are the
  // template's way in - a template cannot call a bare imported function.

  protected rolesOf(staffKey: string): string {
    return rolesOf(this.draft, staffKey);
  }

  protected branchesOf(staffKey: string): string {
    return branchesOf(this.draft, staffKey);
  }

  protected staffAt(branchKey: string): string {
    return staffAt(this.draft, branchKey);
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

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------

  /**
   * The branch the dialog is open over, or null.
   *
   * The dialog needs the row's values and `editingBranch` holds only its key, so the
   * lookup is here rather than in the template - and it answers `null` for a key
   * whose row has since gone, which closes the dialog rather than opening it over
   * nothing.
   */
  protected readonly branchBeingEdited = computed(
    () => this.draft.branches().find((row) => row.key === this.editingBranch()) ?? null,
  );

  protected startAddBranch(): void {
    this.editingBranch.set(null);
    this.addingBranch.set(true);
  }

  protected startEditBranch(key: string): void {
    this.addingBranch.set(false);
    this.editingBranch.set(key);
  }

  /**
   * Closes the branch dialog, however it ended, and puts focus back on the plus.
   *
   * THE FOCUS MOVE IS NOT OPTIONAL. A modal dialog holds focus while it is open, and
   * this one closes by no longer being rendered - so the element focus was inside is
   * removed from the document and focus falls back to `<body>`. A keyboard reader
   * would be returned to the top of the page having just added one branch of four.
   * The plus is where they were before they opened it, and where they will press
   * next.
   */
  protected closeBranchForm(): void {
    this.addingBranch.set(false);
    this.editingBranch.set(null);
    this.focusById('add-branch');
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

  /** The staff member the dialog is open over, or null. See {@link branchBeingEdited}. */
  protected readonly staffBeingEdited = computed(
    () => this.draft.staff().find((row) => row.key === this.editingStaff()) ?? null,
  );

  /** Closes the staff dialog and puts focus back on the plus. See {@link closeBranchForm}. */
  protected closeStaffForm(): void {
    this.addingStaff.set(false);
    this.editingStaff.set(null);
    this.focusById('add-staff');
  }

  protected addStaff(values: StaffValues): void {
    this.draft.setStaff(this.draft.addStaffEntry(), values);
    this.closeStaffForm();
  }

  protected saveStaff(key: string, values: StaffValues): void {
    this.draft.setStaff(key, values);
    this.closeStaffForm();
  }

  // ---------------------------------------------------------------------------
  // The plan, and what it entitles the practice to
  // ---------------------------------------------------------------------------

  // Choosing it belongs to `app-plan-choice`, which writes the same draft this page
  // reads. What is left here is what the choice ENTITLES the practice to, because
  // that is counted in the two steps below rather than on the card.

  /**
   * Staff against the chosen plan's seats, and branches against its branches.
   *
   * Both are `null` until a plan whose limits are known is chosen - before that
   * there is no number to count against, and "3 of ?" says nothing. They appear the
   * moment a plan is picked rather than only when something goes wrong (§5), and
   * they follow a plan change without touching a row: they are derived from the
   * plan and the rows, so changing either recomputes both and clears nothing.
   *
   * NEITHER BLOCKS SUBMIT. They warn; the server decides (§5, `EPM-ORG-006`).
   */
  protected readonly seats = computed(() =>
    counted(this.draft.staffCount(), this.plans.limitsOf(this.draft.plan())?.seatLimit),
  );

  protected readonly branchAllowance = computed(() =>
    counted(this.draft.branchCount(), this.plans.limitsOf(this.draft.plan())?.branchLimit),
  );

  // ---------------------------------------------------------------------------
  // Creating it
  // ---------------------------------------------------------------------------

  /**
   * Everything wrong with the form right now, from either side of the network.
   *
   * Set when submit is pressed and when the server answers, and cleared by the next
   * attempt. It is not recomputed as the reader types: a message that vanishes
   * halfway through fixing the thing it is about takes the explanation with it.
   */
  protected readonly faults = signal<readonly Fault[]>([]);

  protected readonly isSubmitting = computed(
    () => this.onboarding.submission().kind === 'submitting',
  );

  /** The response, once there is one. Both a 201 and a 200 arrive here (§4). */
  protected readonly created = computed(() => {
    const submission = this.onboarding.submission();

    return submission.kind === 'created' ? submission.created : null;
  });

  /** No answer at all - as opposed to a refusal, which arrives as a fault. */
  protected readonly isUnreachable = computed(
    () => this.onboarding.submission().kind === 'unreachable',
  );

  /**
   * Checks the form and, if it holds up, sends it.
   *
   * The client's rules are checked first so that the two mistakes §4 says should
   * never reach the server - a repeated branch name, a repeated email - do not, and
   * so that a reader is not made to wait on a round trip to be told a field is
   * empty. When they fail, nothing is sent at all (criteria 9-12).
   */
  protected create(): void {
    const found = faultsIn(this.draft);

    this.faults.set(found);

    if (found.length > 0) {
      this.reveal(found[0]);

      return;
    }

    this.onboarding.submit(onboardRequestFrom(this.draft));
  }

  /**
   * Clears the screen for another practice.
   *
   * Both halves matter and they belong together: the draft is emptied, and the
   * submission - with the idempotency key inside it - is ended. Doing one without
   * the other is either a blank form that would repeat the key (creating nothing on
   * the second submit, and looking as though it had) or a filled form with a fresh
   * key (creating a duplicate practice). Criterion 6.
   */
  protected startAnother(): void {
    this.draft.reset();
    this.onboarding.startAnother();
    this.faults.set([]);
    this.furthest.set(PRACTICE);
    this.open(PRACTICE);
  }

  // ---------------------------------------------------------------------------
  // Where the messages go
  // ---------------------------------------------------------------------------

  /** The faults about a region as a whole, rather than about one of its rows. */
  protected regionFaults(region: FaultRegion): readonly Fault[] {
    return this.faults().filter((fault) => fault.region === region && fault.rowKey === undefined);
  }

  /** The faults about one branch or staff row. */
  protected rowFaults(region: FaultRegion, rowKey: string): readonly Fault[] {
    return this.faults().filter((fault) => fault.region === region && fault.rowKey === rowKey);
  }

  protected hasRowFault(region: FaultRegion, rowKey: string): boolean {
    return this.rowFaults(region, rowKey).length > 0;
  }

  /**
   * Opens whatever it takes to see a fault, and puts focus on it.
   *
   * A message beside a control inside a collapsed step is a message nobody reads,
   * and this form keeps its rows collapsed to a line until one is being edited - so
   * showing a fault means opening its step AND, when it is about a row, opening
   * that row's form. Only then is there a control to focus.
   *
   * A fault with no field is shown at the top of its step and the step panel takes
   * focus, which is the honest place for "one of these is wrong" (criteria 13, 15).
   */
  private reveal(fault: Fault): void {
    const step = STEP_OF[fault.region];

    if (fault.rowKey !== undefined) {
      if (fault.region === 'branches') {
        this.startEditBranch(fault.rowKey);
      } else if (fault.region === 'staff') {
        this.startEditStaff(fault.rowKey);
      }
    }

    this.open(step, controlIdFor(fault));
  }

  /**
   * Opens a step and moves focus into it.
   *
   * Without the focus move, pressing Continue at the foot of one step leaves a
   * keyboard reader's focus at the bottom of a panel that has just closed, and a
   * screen-reader user hears nothing at all - the page changed somewhere they are
   * not. The panel is focused rather than its first field, so what is read out is
   * the step they arrived at and not a lone label - unless a fault named a control,
   * in which case that control is the whole point of the move.
   */
  private open(step: number, controlId?: string): void {
    this.openStep.set(step);
    this.furthest.update((furthest) => Math.max(furthest, step));

    // The panel it names does not exist until the view has caught up with the
    // signal, so this waits for the render rather than reaching for it now.
    // `afterNextRender` rather than `requestAnimationFrame`: it is the same moment
    // in a browser and a defined one in a test, which is what lets criterion 14 -
    // "focus moves to the speciality control of the staff row the server named" -
    // be asserted rather than described.
    afterNextRender(
      () => {
        const host = this.host.nativeElement as HTMLElement;
        const target =
          (controlId === undefined ? null : host.querySelector<HTMLElement>(`#${controlId}`)) ??
          host.querySelector<HTMLElement>(`#step-panel-${step}`);

        target?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * Focuses one control once the view has caught up with the signal that changed.
   *
   * The same `afterNextRender` reasoning as {@link open}: the element does not exist
   * yet at the moment the decision to focus it is taken, and this is a defined
   * moment in a test as well as in a browser.
   */
  private focusById(id: string): void {
    afterNextRender(
      () => {
        const host = this.host.nativeElement as HTMLElement;

        host.querySelector<HTMLElement>(`#${id}`)?.focus();
      },
      { injector: this.injector },
    );
  }
}

/** Which step owns each region's messages. */
const STEP_OF: Readonly<Record<FaultRegion, number>> = {
  practice: PRACTICE,
  branches: BRANCHES,
  staff: STAFF,
  // Not a region of the form: it is the submission itself, and the create button is
  // on the review step.
  form: REVIEW,
};

/** Where a staff fault's field lives, inside the one open staff form. */
const STAFF_CONTROL_OF: Readonly<Partial<Record<FaultField, string>>> = {
  fullName: 'staff-form-name',
  email: 'staff-form-email',
  speciality: 'staff-form-speciality',
  roles: 'staff-form-roles',
  branches: 'staff-form-branches',
};

/**
 * The element a fault names, by id - or nothing, which focuses the step instead.
 *
 * THE REGION IS PART OF THE ANSWER, not decoration: `name` means the practice's
 * name in one region and a branch's in another, and a lookup by field alone would
 * send a branch fault to the practice step's input. That is the kind of mistake
 * that only shows up when somebody hits the error, which is the worst time.
 *
 * The row forms use fixed ids because at most one of each is ever open (see
 * `OnboardPractice`'s note on a list and a form), so an id is unique on the page
 * even though the row it belongs to is not.
 */
function controlIdFor(fault: Fault): string | undefined {
  if (fault.field === undefined) {
    return undefined;
  }

  switch (fault.region) {
    case 'practice':
      return fault.field === 'plan' ? 'practice-plan' : 'practice-name';

    case 'branches':
      return fault.field === 'name' ? 'branch-form-name' : undefined;

    case 'staff':
      return STAFF_CONTROL_OF[fault.field];

    default:
      return undefined;
  }
}

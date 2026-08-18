import { Component, computed, effect, inject, linkedSignal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlatformOrganizationStatusEnum } from 'api-client';

import { practicePath } from '../../../../route-paths';
import { Plans } from '../../data/plans';
import { Practice } from '../../data/practice';
import { PracticeUpdate } from '../../data/practice-update';
import { messageForUpdateProblem, MISSING, UNREACHABLE } from '../../data/update-messages';

/** The statuses a practice can be moved between, in the order they read. */
const STATUSES = [
  { value: PlatformOrganizationStatusEnum.Active, label: 'Active' },
  { value: PlatformOrganizationStatusEnum.Suspended, label: 'Suspended' },
  { value: PlatformOrganizationStatusEnum.Closed, label: 'Closed' },
] as const;

/**
 * Changing a practice: its name, its plan, its status.
 *
 * READ THIS BEFORE CHANGING ANYTHING HERE. THIS SCREEN SAVES THE NAME AND ONLY THE
 * NAME, and that is a fact about the API rather than a decision taken here. The
 * form shows three fields and the platform API covers one of them:
 *
 *     name    PATCH /platform/organizations/{id}   updateOrganizationFromPlatform
 *     status  three transition routes, not called from here - see below
 *     plan    NO ROUTE AT ALL. Nothing changes a practice's plan
 *
 * So the submit is enabled by a change to the NAME. A change to the plan or the
 * status leaves it disabled, and a note beside the field says why, because the
 * alternative is a button that saves one of the two things the reader just changed
 * and reports success.
 *
 * A BUTTON THAT LOOKED LIKE IT SAVED WOULD BE THE WORST THING ON THIS SCREEN, and
 * that was true when nothing could be saved and is still true now that something
 * can. A platform administrator who believes they have suspended a practice, on a
 * product where suspension is a billing and access decision, has been told
 * something untrue about a real customer. A save that quietly dropped the half of
 * the form it has no route for would be exactly that, with the button working.
 *
 * WHY STATUS IS NOT WIRED HERE. It is not one more member on the PATCH - it is
 * three routes, `suspendOrganization`, `reopenOrganization` and `closeOrganization`,
 * one per transition and each with its own precondition. A transition that is not
 * allowed from the current status is 422 EPM-ORG-013, which carries `from` and `to`;
 * repeating one is that error rather than a quiet success, and CLOSED is terminal.
 * Wiring them means deciding what a form that edits a name and a status TOGETHER
 * does when the first call succeeds and the second is refused, and that decision is
 * not made here. F1 §7 item 1e owns it.
 *
 * The generated `UpdateOrganizationRequest` carries `status` as an optional member,
 * so putting it on the PATCH COMPILES and is 422 EPM-ORG-007 at runtime whatever
 * its value. `PracticeUpdate` builds the body one member at a time for that reason.
 */
@Component({
  selector: 'app-practice-edit',
  imports: [RouterLink],
  templateUrl: './practice-edit.html',
  styleUrl: './practice-edit.scss',
})
export class PracticeEdit {
  private readonly route = inject(ActivatedRoute);

  protected readonly practice = inject(Practice);
  protected readonly plans = inject(Plans);
  protected readonly update = inject(PracticeUpdate);

  protected readonly statuses = STATUSES;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly id = computed(() => this.params().get('id') ?? '');

  protected readonly backLink = computed(() => practicePath(this.id()));

  constructor() {
    // The saved-and-refused states live in a root service, so they outlast this
    // screen. Opening a DIFFERENT practice with "Saved. This practice is now called
    // Nile Care Group" still on it would attribute one practice's save to another.
    effect(() => {
      const id = this.id();

      untracked(() => {
        this.practice.show(id);
        this.update.editing();
      });
    });

    // THE ANSWER IS THE PRACTICE. The PATCH replies with the same body the read
    // does, so what is on screen is replaced from the response rather than fetched
    // again - which also puts the fields, the comparison panel and `isChanged` back
    // in step in one move, since all three are derived from the practice held.
    effect(() => {
      const progress = this.update.progress();

      if (progress.kind === 'saved') {
        untracked(() => this.practice.accept(progress.practice));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // The form
  // ---------------------------------------------------------------------------

  // `linkedSignal` on what arrived, so the fields fill themselves in when the
  // practice lands and a reader's edits are not thrown away by a re-render. The
  // same shape the console's other row forms use.

  protected readonly name = linkedSignal(() => this.practice.practice()?.name ?? '');

  protected readonly plan = linkedSignal(() => this.practice.practice()?.subscription?.plan ?? '');

  protected readonly status = linkedSignal<string>(
    () => this.practice.practice()?.status ?? PlatformOrganizationStatusEnum.Active,
  );

  /** What the practice arrived as, for telling a change from a re-render. */
  private readonly original = computed(() => ({
    name: this.practice.practice()?.name ?? '',
    plan: this.practice.practice()?.subscription?.plan ?? '',
    status: (this.practice.practice()?.status ?? '') as string,
  }));

  /**
   * Whether ANYTHING on the form differs from what was read.
   *
   * It drives the line under the controls and whether Undo is offered, and it is
   * deliberately not what enables the submit - that is `canSave`, which asks about
   * the name alone, because the name is the only field with a route behind it.
   * Trimmed on the name, because a trailing space is not an edit somebody meant.
   */
  protected readonly isChanged = computed(
    () =>
      this.name().trim() !== this.original().name.trim() ||
      this.plan() !== this.original().plan ||
      this.status() !== this.original().status,
  );

  /** Everything wrong with the form, in the order the form reads. */
  protected readonly faults = computed(() => {
    const faults: string[] = [];

    if (this.name().trim() === '') {
      faults.push('Give the practice a name.');
    }

    if (this.plan() === '') {
      faults.push('Choose a plan.');
    }

    return faults;
  });

  protected readonly isValid = computed(() => this.faults().length === 0);

  // ---------------------------------------------------------------------------
  // What can be saved, and what cannot
  // ---------------------------------------------------------------------------

  /** Whether the NAME differs from what was read - the one change with a route. */
  protected readonly isNameChanged = computed(
    () => this.name().trim() !== this.original().name.trim(),
  );

  /**
   * The changed fields this screen has no route for, named for the reader.
   *
   * THEY BLOCK THE SAVE RATHER THAN BEING DROPPED FROM IT. A submit that sent the
   * name and silently left the status alone would report success for half of what
   * the reader changed, and the half it discarded is the one that decides whether a
   * practice can be used. Naming the field and refusing until it is put back is the
   * only version of this that cannot mislead - see `revertUnsaveable`, which is the
   * one-press way back.
   */
  protected readonly unsaveable = computed(() => {
    const changed: string[] = [];

    if (this.plan() !== this.original().plan) {
      changed.push('plan');
    }

    if (this.status() !== this.original().status) {
      changed.push('status');
    }

    return changed;
  });

  protected readonly isSaving = computed(() => this.update.progress().kind === 'saving');

  protected readonly canSave = computed(
    () =>
      this.isNameChanged() && this.isValid() && this.unsaveable().length === 0 && !this.isSaving(),
  );

  /** The name the server answered with, when the last save succeeded. */
  protected readonly savedAs = computed(() => {
    const progress = this.update.progress();

    return progress.kind === 'saved' ? progress.practice.name : undefined;
  });

  /** Why the last save did not happen, in this console's words. */
  protected readonly failure = computed(() => {
    const progress = this.update.progress();

    switch (progress.kind) {
      case 'rejected':
        return messageForUpdateProblem(progress.problem);
      case 'missing':
        return MISSING;
      case 'unreachable':
        return UNREACHABLE;
      default:
        return undefined;
    }
  });

  // ---------------------------------------------------------------------------
  // What the practice is now, beside what it would become
  // ---------------------------------------------------------------------------

  /** The status the practice actually has, worded. It does not follow the field. */
  protected readonly nowStatus = computed(
    () => STATUSES.find((option) => option.value === this.original().status)?.label ?? '—',
  );

  protected readonly nowTone = computed(() => {
    const status = this.original().status;

    if (status === PlatformOrganizationStatusEnum.Active) {
      return 'active';
    }

    return status === PlatformOrganizationStatusEnum.Suspended ? 'warning' : 'quiet';
  });

  /** `6 of 20`, or nothing when either half of it is missing. */
  protected readonly seats = computed(() =>
    reading(
      this.practice.practice()?.subscription?.seatsUsed,
      this.practice.practice()?.subscription?.seatLimit,
    ),
  );

  protected readonly branches = computed(() =>
    reading(
      this.practice.practice()?.subscription?.branchesUsed,
      this.practice.practice()?.subscription?.branchLimit,
    ),
  );

  /**
   * The three fields, each as what it is now beside what it would become.
   *
   * WHY THE COMPARISON IS BUILT HERE RATHER THAN READ OFF THE FORM. A form on its
   * own makes the reader hold the old value in their head: they type over "Nile
   * Care", and the thing they are replacing is gone from the screen. `Standard →
   * Pro` is the edit itself, and it is the one thing this screen can show that a
   * bare form cannot.
   *
   * Every field is listed, changed or not, so the panel is the practice rather than
   * a diff that appears and disappears under the reader as they type.
   */
  protected readonly comparison = computed<readonly Change[]>(() => {
    const original = this.original();

    return [
      { label: 'Name', from: original.name || '—', to: this.name().trim() || '—' },
      { label: 'Plan', from: original.plan || '—', to: this.plan() || '—' },
      {
        label: 'Status',
        from: labelOf(original.status),
        to: labelOf(this.status()),
      },
    ].map((row) => ({ ...row, isChanged: row.from !== row.to }));
  });

  /**
   * What the plan change would do to the limits, when it is a change.
   *
   * A PLAN IS A PRICE AND TWO NUMBERS. `listPlans` carries both, so the consequence
   * of the option in the select can be said in the same breath as the option -
   * "fifty seats becomes two hundred" is the decision, and looking that up in
   * another screen is the work this saves.
   */
  protected readonly limitChange = computed(() => {
    const now = this.plans.limitsOf(this.original().plan);
    const next = this.plans.limitsOf(this.plan());

    if (now === undefined || next === undefined || this.plan() === this.original().plan) {
      return undefined;
    }

    return { now, next };
  });

  /**
   * What the plan currently chosen in the select entitles the practice to.
   *
   * A PLAN CHANGE IS A LIMIT CHANGE, and the limits are the thing somebody is
   * really choosing between - `listPlans` carries both, so the consequence can sit
   * beside the choice rather than being looked up somewhere else.
   */
  protected readonly chosenLimits = computed(() => this.plans.limitsOf(this.plan()));

  /** Whether a plan change would leave the practice over one of its new limits. */
  protected readonly wouldExceed = computed(() => {
    const limits = this.chosenLimits();
    const subscription = this.practice.practice()?.subscription;

    if (limits === undefined || subscription === undefined) {
      return [];
    }

    const over: string[] = [];

    // SAID BEFORE THE CHANGE RATHER THAN AFTER IT. Moving a practice DOWN a plan is
    // the one edit on this form that can break something, and "41 seats in use, 10
    // allowed" is the fact that decides it - not something to discover from a
    // support ticket a week later.
    if ((subscription.seatsUsed ?? 0) > (limits.seatLimit ?? 0)) {
      over.push(
        `${subscription.seatsUsed} seats are in use and this plan allows ${limits.seatLimit}`,
      );
    }

    if ((subscription.branchesUsed ?? 0) > (limits.branchLimit ?? 0)) {
      over.push(
        `${subscription.branchesUsed} branches are in use and this plan allows ${limits.branchLimit}`,
      );
    }

    return over;
  });

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.update.editing();
  }

  protected onPlan(event: Event): void {
    this.plan.set((event.target as HTMLSelectElement).value);
    this.update.editing();
  }

  protected onStatus(value: string): void {
    this.status.set(value);
    this.update.editing();
  }

  /** Puts every field back to what the practice arrived as. */
  protected revert(): void {
    untracked(() => {
      const original = this.original();

      this.name.set(original.name);
      this.plan.set(original.plan);
      this.status.set(original.status);
    });

    this.update.editing();
  }

  /**
   * Puts back only the fields that cannot be saved, leaving the name alone.
   *
   * The way out of the block the `unsaveable` note describes. `revert` would undo
   * the name too, which is the edit the reader came here to make and the one this
   * screen can actually send.
   */
  protected revertUnsaveable(): void {
    untracked(() => {
      const original = this.original();

      this.plan.set(original.plan);
      this.status.set(original.status);
    });

    this.update.editing();
  }

  /**
   * Sends the new name.
   *
   * THE TRIM IS THE VALUE THAT GOES, not merely the value that is compared. A
   * trailing space is not an edit somebody meant to make, and `isNameChanged`
   * already ignores one - so sending the untrimmed field would let a press that the
   * form called "no change" travel to the server anyway.
   *
   * The `canSave` guard repeats what the disabled button says, because a disabled
   * button is a rendering: Enter on the form reaches here without touching it.
   */
  protected submit(event: Event): void {
    event.preventDefault();

    if (!this.canSave()) {
      return;
    }

    this.update.save(this.id(), this.name().trim());
  }
}

/** `6 of 20`, or `''` when either half of the pair did not arrive. */
/** One field, as it is now beside what it would become. */
interface Change {
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly isChanged: boolean;
}

/** A status in the console's words, or the server's own if this build has none. */
function labelOf(status: string): string {
  return STATUSES.find((option) => option.value === status)?.label ?? status ?? '—';
}

function reading(used: number | undefined, limit: number | undefined): string {
  return used === undefined || limit === undefined ? '' : `${used} of ${limit}`;
}

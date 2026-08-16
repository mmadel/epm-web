import { Component, computed, effect, inject, linkedSignal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlatformOrganizationStatusEnum } from 'api-client';

import { practicePath } from '../../../../route-paths';
import { Plans } from '../../data/plans';
import { Practice } from '../../data/practice';

/** The statuses a practice can be moved between, in the order they read. */
const STATUSES = [
  { value: PlatformOrganizationStatusEnum.Active, label: 'Active' },
  { value: PlatformOrganizationStatusEnum.Suspended, label: 'Suspended' },
  { value: PlatformOrganizationStatusEnum.Closed, label: 'Closed' },
] as const;

/**
 * Changing a practice: its name, its plan, its status.
 *
 * READ THIS BEFORE CHANGING ANYTHING HERE. The routes this screen was waiting on
 * exist as of `@mmadel/openapi-spec@0.2.0`:
 *
 *     PATCH /api/v1/platform/organizations/{id}           updateOrganizationFromPlatform
 *     POST  /api/v1/platform/organizations/{id}/suspend   suspendOrganization
 *     POST  /api/v1/platform/organizations/{id}/reopen    reopenOrganization
 *     POST  /api/v1/platform/organizations/{id}/close     closeOrganization
 *
 * THIS SCREEN DOES NOT CALL THEM YET, SO IT STILL DOES NOT PRETEND TO SAVE. It
 * reads the practice, fills the form in, validates what is typed, and tracks what
 * has changed - all of which is real. What it will not do is accept a press on a
 * control that is wired to nothing: the submit is disabled and a notice above the
 * form says so.
 *
 * A BUTTON THAT LOOKED LIKE IT SAVED WOULD BE THE WORST THING ON THIS SCREEN. A
 * platform administrator who believes they have suspended a practice, on a product
 * where suspension is a billing and access decision, has been told something untrue
 * about a real customer. An optimistic update, a toast, a local-only edit - each of
 * them is that same lie with a different amount of work behind it. That the routes
 * now exist changes none of that; only calling them does.
 *
 * WIRING IT IS NOT ONE CALL. This form edits a name and a status together, and they
 * are different operations with different rules:
 *
 *   - `name` goes through the PATCH, which accepts `name` and nothing else. The
 *     generated `UpdateOrganizationRequest` carries `status` as an optional member
 *     too, so sending it COMPILES - and is 422 EPM-ORG-007 at runtime whatever its
 *     value.
 *   - `status` moves through the three POST routes, one per transition, each with
 *     its own precondition. A transition not allowed from the current status is 422
 *     EPM-ORG-013, carrying `from` and `to`. Repeating one is that error rather
 *     than a quiet success, and CLOSED is terminal. Their body is empty, generated
 *     as `body?: any` - so a body compiles too, and is 400 EPM-REQ-002.
 *
 * All four return the same body as getOrganizationById, so nothing here needs a
 * second read after a write.
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

  protected readonly statuses = STATUSES;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly id = computed(() => this.params().get('id') ?? '');

  protected readonly backLink = computed(() => practicePath(this.id()));

  constructor() {
    effect(() => this.practice.show(this.id()));
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
   * Whether anything on the form differs from what was read.
   *
   * It drives the notice under the controls and, when there is a route, will drive
   * whether submitting does anything. Trimmed on the name, because a trailing space
   * is not an edit somebody meant to make.
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
  }

  protected onPlan(event: Event): void {
    this.plan.set((event.target as HTMLSelectElement).value);
  }

  protected onStatus(value: string): void {
    this.status.set(value);
  }

  /** Puts every field back to what the practice arrived as. */
  protected revert(): void {
    untracked(() => {
      const original = this.original();

      this.name.set(original.name);
      this.plan.set(original.plan);
      this.status.set(original.status);
    });
  }

  /**
   * What submitting would do, if there were a route.
   *
   * IT IS NOT WIRED TO A CONTROL. The submit is disabled, so this cannot be reached
   * from the screen; it is here so that the one line that changes when the route
   * lands is obvious, and so that nothing else on this screen has to move.
   */
  protected submit(event: Event): void {
    event.preventDefault();
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

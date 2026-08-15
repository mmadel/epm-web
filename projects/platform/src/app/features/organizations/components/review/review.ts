import { Component, computed, inject } from '@angular/core';

import { Plans } from '../../data/plans';
import { OrganizationDraft } from '../../organization-draft';
import {
  Assignment,
  branchesFor,
  counted,
  rolesOf,
  staffAtBranch,
} from '../../organization-summary';

/**
 * The whole organization, read back, on the step before it is created.
 *
 * IT IS THE LAST SCREEN BEFORE SOMETHING IRREVERSIBLE, and that is what it is built
 * around: everything a reader would want to check is on it, and nothing here can
 * change any of it. Four tiles say what is about to exist, two lists say what is in
 * it, and one sentence says exactly what the call will create.
 *
 * WHAT IT ADDS OVER THE STEPS ABOVE - and each of these was missing:
 *
 * - THE SUBSCRIPTION. The call creates a practice, a subscription, every branch and
 *   every staff member. Three of those were on this screen; the subscription only
 *   appeared afterwards, on the receipt, as an id for a thing nobody had been told
 *   was being made.
 * - WHAT THE PLAN ALLOWS, against what has been used. The counters live in the two
 *   steps that count them, so the one screen where both numbers matter at once - the
 *   one with the irreversible button on it - was the only screen without either.
 * - A WARNING WHEN IT IS OVER. Steps 2 and 3 warn; this step did not, which made the
 *   last thing a reader saw before pressing the quietest thing on the subject.
 *
 * It reads the same draft the steps write to and owns none of it - the same
 * arrangement the ledger uses. THE CREATE BUTTON IS NOT HERE: this reads, the page
 * submits, and a component that both described a thing and destroyed the form would
 * be two jobs in one file.
 */
@Component({
  selector: 'app-review',
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class Review {
  protected readonly draft = inject(OrganizationDraft);
  private readonly plans = inject(Plans);

  private readonly limits = computed(() => this.plans.limitsOf(this.draft.plan()));

  /** What the chosen plan comes with, as the line under its name. Empty until one is. */
  protected readonly allowance = computed(() => {
    const limits = this.limits();

    if (limits === undefined) {
      return '';
    }

    return [say(limits.seatLimit, 'seat', 'seats'), say(limits.branchLimit, 'branch', 'branches')]
      .filter((part) => part !== '')
      .join(' · ');
  });

  protected readonly branchAllowance = computed(() =>
    counted(this.draft.branchCount(), this.limits()?.branchLimit),
  );

  protected readonly seats = computed(() =>
    counted(this.draft.staffCount(), this.limits()?.seatLimit),
  );

  /** True when either count is past what the plan allows. It warns and never blocks. */
  protected readonly isOverPlan = computed(
    () => (this.branchAllowance()?.isOver ?? false) || (this.seats()?.isOver ?? false),
  );

  /**
   * What the one call will create, counted out.
   *
   * IT NAMES THE SUBSCRIPTION, which is the whole reason it is a sentence rather than
   * the four tiles above repeated. A reader who has filled in a practice, its
   * branches and its staff has not been told that a subscription is created too, and
   * finding out from an id on the receipt is finding out afterwards.
   */
  protected readonly whatIsCreated = computed(() => {
    const branches = this.draft.branchCount();
    const staff = this.draft.staffCount();

    return (
      'One call creates the practice, its subscription, ' +
      `${say(branches, 'branch', 'branches')} and ${say(staff, 'person', 'people')}.`
    );
  });

  // The children of a node, in both directions. They are arrays rather than the joined
  // lines the steps' own lists use, because a tree renders each one as a row of its
  // own - which is the whole difference between "Mona Hassan, Karim Saleh" and being
  // able to see at a glance that Zamalek has nobody under it.

  protected staffAtBranch(branchKey: string): readonly Assignment[] {
    return staffAtBranch(this.draft, branchKey);
  }

  protected branchesFor(staffKey: string): readonly Assignment[] {
    return branchesFor(this.draft, staffKey);
  }

  protected rolesOf(staffKey: string): string {
    return rolesOf(this.draft, staffKey);
  }
}

/** "1 branch", "3 branches" - or nothing at all for a number the response omitted. */
function say(count: number | undefined, one: string, many: string): string {
  return count === undefined ? '' : `${count} ${count === 1 ? one : many}`;
}

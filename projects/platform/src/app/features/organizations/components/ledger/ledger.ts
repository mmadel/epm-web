import { Component, computed, inject } from '@angular/core';

import { Plans } from '../../data/plans';
import { OrganizationDraft } from '../../organization-draft';
import { counted } from '../../organization-summary';

/** How many names the panel shows before it stops and counts the rest. */
const SHOWN = 5;

/** A row on the list, and whether it has been named yet. */
interface Row {
  readonly label: string;
  readonly isEmpty: boolean;
}

/**
 * What will exist when the call returns, beside the thing being filled in.
 *
 * IT IS WHY THE SCREEN IS TWO COLUMNS. A form column on its own leaves half a desktop
 * empty, and the half was worth an answer to "what am I actually making" that does not
 * cost a scroll to the last step. It is sticky, because that question does not stop
 * being asked when the form scrolls.
 *
 * IT ANSWERS A SECOND QUESTION NOW: what is still missing. Every step of this form has
 * a disabled button and a line of small print explaining it, and the last one has a
 * button that is only live when all three steps are done - so "why can I not create
 * this yet" was a question the screen answered three times, quietly, in three places a
 * reader has to go looking for. It is answered here once, always visible, and it is
 * the same three rules the buttons themselves are disabled by: they are read off the
 * draft, not restated.
 *
 * IT OWNS NOTHING. Every value here is read from the same draft the steps write to, so
 * there is no second copy of the organization to fall out of step with the first -
 * which is the failure mode of a summary panel that is handed its data.
 */
@Component({
  selector: 'app-ledger',
  templateUrl: './ledger.html',
  styleUrl: './ledger.scss',
})
export class Ledger {
  protected readonly draft = inject(OrganizationDraft);
  private readonly plans = inject(Plans);

  private readonly limits = computed(() => this.plans.limitsOf(this.draft.plan()));

  protected readonly branchAllowance = computed(() =>
    counted(this.draft.branchCount(), this.limits()?.branchLimit),
  );

  protected readonly seats = computed(() =>
    counted(this.draft.staffCount(), this.limits()?.seatLimit),
  );

  /**
   * What is still needed before this can be created.
   *
   * THE SAME THREE RULES THE BUTTONS USE, read off the draft rather than restated
   * here: a fourth definition of "is this finished" is a fourth thing to keep in step
   * with the other three, and the one that disagrees is always the one nobody looks
   * at. The wording says what each rule actually checks - "at least one branch" alone
   * would tick while a branch sat there unnamed.
   */
  protected readonly checks = computed(() => [
    { label: 'Practice named, and on a plan', done: this.draft.practiceIsComplete() },
    { label: 'At least one branch, each named', done: this.draft.branchesAreComplete() },
    { label: 'At least one person, each complete', done: this.draft.staffAreComplete() },
  ]);

  protected readonly isReady = this.draft.isComplete;

  // THE LISTS ARE CAPPED. A practice with twelve branches turned this panel into a
  // rail longer than the form beside it, and a sticky column taller than the window
  // stops being sticky - it scrolls, and the counts at the top of it leave the screen.
  // Five names and a count of the rest keeps the question it answers ("what am I
  // making") answered, and the step itself holds the full list.

  protected readonly branches = computed(() =>
    rows(this.draft.branches(), (branch, at) => [branch.name, `Branch ${at + 1}`]),
  );

  protected readonly staff = computed(() =>
    rows(this.draft.staff(), (member, at) => [member.fullName, `Staff member ${at + 1}`]),
  );

  protected readonly shownBranches = computed(() => this.branches().slice(0, SHOWN));
  protected readonly shownStaff = computed(() => this.staff().slice(0, SHOWN));

  protected readonly moreBranches = computed(
    () => this.branches().length - this.shownBranches().length,
  );
  protected readonly moreStaff = computed(() => this.staff().length - this.shownStaff().length);
}

/** Names the rows, and remembers which of them are placeholders for something unnamed. */
function rows<T>(
  all: readonly T[],
  name: (row: T, at: number) => [string, string],
): readonly Row[] {
  return all.map((row, at) => {
    const [given, fallback] = name(row, at);

    return { label: given.trim() || fallback, isEmpty: given.trim() === '' };
  });
}

import { computed, Injectable, signal } from '@angular/core';

/**
 * A branch being drafted.
 *
 * `key` is a client-side identity and never leaves the browser. It exists so that
 * a staff member can point at a branch that has no server id yet - see the class
 * note, which is the most important comment in this file.
 */
export interface BranchDraft {
  readonly key: string;
  name: string;
  phone: string;
}

/** A staff member being drafted. */
export interface StaffDraft {
  readonly key: string;
  fullName: string;
  email: string;
  roles: readonly string[];
  specialityCode: string;
  /** The branches they work at, BY KEY. Never by position - see the class note. */
  readonly branchKeys: readonly string[];
}

/**
 * The organization being built: one practice, its branches and its staff.
 *
 * THE WHOLE CONSOLE IS THIS ONE OBJECT. The four steps on screen are four views of
 * it rather than four screens handing data to each other, which is why it lives in
 * a service: the progress bar, each step's collapsed summary, the review and the
 * step being edited all read the same signals.
 *
 * PROVIDED IN ROOT, so there is one draft in a console with one job. `reset()` is
 * what ends one, and it will be called after a submission succeeds rather than by
 * a component being destroyed - a draft that vanished because somebody navigated
 * to "Page not found" and back would be a bad surprise.
 *
 * STAFF REFERENCE BRANCHES BY KEY, AND POSITIONS ARE COMPUTED ONCE, IN
 * `onboardRequestFrom` (`data/onboard-request.ts`). The API takes each staff
 * member's branches as positions in the
 * branches array (`LLD-ORGANIZATION.md` §2.1), and the branches do not exist yet so
 * they have no ids. Holding positions in state means every removal and every
 * reorder has to renumber every staff member, and the milestone calls that out as
 * the defect most likely to ship: it fails silently, the request succeeds, and the
 * wrong people are assigned to the wrong branch. A key cannot drift when a row
 * moves, so reordering is free and removing a branch can only ever drop the
 * assignment to the branch that was actually removed.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationDraft {
  // A counter rather than a random or time-based id: the keys never leave the
  // browser, so uniqueness within one draft is the entire requirement, and a
  // counter makes a test's expectations readable.
  private nextKey = 0;

  private readonly practiceName = signal('');
  private readonly practicePlan = signal('');
  private readonly branchRows = signal<readonly BranchDraft[]>([]);
  private readonly staffRows = signal<readonly StaffDraft[]>([]);

  readonly name = this.practiceName.asReadonly();
  readonly plan = this.practicePlan.asReadonly();
  readonly branches = this.branchRows.asReadonly();
  readonly staff = this.staffRows.asReadonly();

  readonly branchCount = computed(() => this.branchRows().length);
  readonly staffCount = computed(() => this.staffRows().length);

  // ---------------------------------------------------------------------------
  // What each step needs before the next one is offered
  // ---------------------------------------------------------------------------

  // These are the shape of the thing, not its validity. Field-level rules and the
  // server's error codes are P-05's; these only answer whether a step is finished
  // enough to move past.

  readonly practiceIsComplete = computed(
    () => this.practiceName().trim().length > 0 && this.practicePlan().length > 0,
  );

  /** At least one branch, and every row named (P-05.2). */
  readonly branchesAreComplete = computed(() => {
    const rows = this.branchRows();

    return rows.length > 0 && rows.every((row) => row.name.trim().length > 0);
  });

  /**
   * At least one staff member, and every row complete.
   *
   * IT USED TO ALLOW NONE. T-30 read F1 §5 as permitting a practice with nobody in
   * it - they can be added later from inside it - and T-64 §4 says otherwise:
   * `staff` is required, at least one. The ticket is the contract, so the rule
   * changed here; the difference is reported in the PR rather than resolved
   * quietly, because "can a practice be created empty" is a product question and
   * this is only where the answer is enforced.
   *
   * A HALF-FILLED ROW IS NOT ALLOWED either, because that is somebody who started
   * typing a person and stopped.
   */
  readonly staffAreComplete = computed(() => {
    const rows = this.staffRows();

    return (
      rows.length > 0 &&
      rows.every(
        (member) =>
          member.fullName.trim().length > 0 &&
          member.email.trim().length > 0 &&
          member.roles.length > 0 &&
          member.branchKeys.length > 0,
      )
    );
  });

  readonly isComplete = computed(
    () => this.practiceIsComplete() && this.branchesAreComplete() && this.staffAreComplete(),
  );

  // ---------------------------------------------------------------------------
  // The practice
  // ---------------------------------------------------------------------------

  setName(name: string): void {
    this.practiceName.set(name);
  }

  setPlan(plan: string): void {
    this.practicePlan.set(plan);
  }

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------

  /**
   * Replaces one branch with what a form submitted.
   *
   * Wholesale rather than field by field, because a branch is added and edited as
   * a whole: the form holds its own values while it is open and only reaches the
   * draft when somebody presses the button. Nothing half-typed is ever in here.
   */
  setBranch(key: string, values: Omit<BranchDraft, 'key'>): void {
    this.branchRows.update((rows) =>
      rows.map((row) => (row.key === key ? { key, ...values } : row)),
    );
  }

  /**
   * Removes a branch, and with it every assignment to that branch.
   *
   * No renumbering happens, because there are no numbers: a staff member who
   * worked at the removed branch loses that one entry and keeps the rest. This is
   * the operation that silently corrupts a position-based model.
   */
  removeBranch(key: string): void {
    this.branchRows.update((rows) => rows.filter((row) => row.key !== key));
    this.staffRows.update((rows) =>
      rows.map((row) => ({ ...row, branchKeys: row.branchKeys.filter((at) => at !== key) })),
    );
  }

  /** Moves a branch one place. Assignments are untouched, and that is the point. */
  moveBranch(key: string, by: -1 | 1): void {
    this.branchRows.update((rows) => {
      const from = rows.findIndex((row) => row.key === key);
      const to = from + by;

      if (from === -1 || to < 0 || to >= rows.length) {
        return rows;
      }

      const moved = [...rows];
      [moved[from], moved[to]] = [moved[to], moved[from]];

      return moved;
    });
  }

  // ---------------------------------------------------------------------------
  // Staff
  // ---------------------------------------------------------------------------

  removeStaff(key: string): void {
    this.staffRows.update((rows) => rows.filter((row) => row.key !== key));
  }

  /**
   * Replaces one staff member's details with what a form submitted.
   *
   * Wholesale rather than field by field, because a person is added and edited as
   * a whole: the form holds its own values while it is open and only reaches the
   * draft when somebody presses the button. Nothing half-typed is ever in here,
   * which is why a staff member in this list is always a complete one.
   */
  setStaff(key: string, values: Omit<StaffDraft, 'key'>): void {
    this.staffRows.update((rows) =>
      rows.map((row) => (row.key === key ? { key, ...values } : row)),
    );
  }

  /** Adds an empty staff member and answers with its key, for the form to fill. */
  addStaffEntry(): string {
    const key = this.claimKey();

    this.staffRows.update((rows) => [
      ...rows,
      { key, fullName: '', email: '', roles: [], specialityCode: '', branchKeys: [] },
    ]);

    return key;
  }

  /** The same, for a branch. */
  addBranchEntry(): string {
    const key = this.claimKey();

    this.branchRows.update((rows) => [...rows, { key, name: '', phone: '' }]);

    return key;
  }

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  // THERE IS NO `request()` HERE, deliberately. Turning this draft into what the
  // API takes is `onboardRequestFrom` in `data/`, which is the only folder in a
  // feature allowed to name the server's types (`app/README.md`). Nothing in this
  // file knows what a clinic, a specialty or a position is - which is why the
  // vocabulary of the console and the vocabulary of the API can differ without
  // either one leaking into the other.

  /** Ends this draft. Called after a submission succeeds, never on destroy. */
  reset(): void {
    this.practiceName.set('');
    this.practicePlan.set('');
    this.branchRows.set([]);
    this.staffRows.set([]);
  }

  private claimKey(): string {
    this.nextKey += 1;

    return `draft-${this.nextKey}`;
  }
}

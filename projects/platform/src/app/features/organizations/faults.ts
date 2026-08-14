import { OrganizationDraft } from './organization-draft';

/**
 * The three regions of the form - which are also its three steps - and `form`.
 *
 * `form` is the fourth place a message can go: beside the create button, for the
 * failures that belong to the submission rather than to a field. An unrecognised
 * code and a request that never got an answer both land there, because there is no
 * field to point at and a message pinned to an arbitrary one would be a lie.
 */
export type FaultRegion = 'form' | 'practice' | 'branches' | 'staff';

/** The control a fault belongs beside, within its region or its row. */
export type FaultField =
  'name' | 'plan' | 'fullName' | 'email' | 'roles' | 'speciality' | 'branches';

/**
 * Something wrong with the form, and where it belongs on screen.
 *
 * ONE SHAPE FOR BOTH SOURCES. A duplicate email caught here before the request and
 * an `EPM-ORG-003` caught by the server after it are the same fact about the same
 * row, and the screen shows them in the same place - so they are the same type, and
 * the code that renders and focuses them is written once.
 *
 * The message is always written in this console, whichever side found the fault:
 * the client's own rules word themselves, and a server refusal is worded from its
 * code by `messageForProblem`. Nothing a reader sees on this screen comes out of a
 * response body (criterion 16).
 */
export interface Fault {
  readonly region: FaultRegion;
  /** The branch or staff row this is about, when it is about one. */
  readonly rowKey?: string;
  /** The control within that row or region, when there is one. */
  readonly field?: FaultField;
  readonly message: string;
}

/** Matches an address with something either side of an `@` and a dot after it. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everything this client can tell is wrong, in the order the form reads.
 *
 * THE ORDER IS THE READING ORDER, top to bottom, because the first entry is where
 * focus goes when submit is blocked. A list that reported the staff step's faults
 * before the practice step's would send a reader backwards up their own form.
 *
 * These are the rules §4 says the server answers with a 400, checked here so that
 * the common mistakes never cost a round trip. THEY DO NOT REPLACE THE SERVER: it
 * checks all of them again and its answer is the one that counts, which is why
 * every code in §4 is handled even for the two rules - duplicate branch name and
 * duplicate email - that should never reach it.
 *
 * The seat and branch counters are deliberately NOT here. They warn, they never
 * block, and the server owns the limit (§5, `EPM-ORG-006`): a client that refuses
 * to submit at a number the server would have accepted is a form nobody can send
 * for a reason nobody can see.
 */
export function faultsIn(draft: OrganizationDraft): readonly Fault[] {
  return [...practiceFaults(draft), ...branchFaults(draft), ...staffFaults(draft)];
}

function practiceFaults(draft: OrganizationDraft): readonly Fault[] {
  const faults: Fault[] = [];

  if (draft.name().trim() === '') {
    faults.push({ region: 'practice', field: 'name', message: 'Give the practice a name.' });
  }

  if (draft.plan() === '') {
    faults.push({ region: 'practice', field: 'plan', message: 'Choose a plan.' });
  }

  return faults;
}

function branchFaults(draft: OrganizationDraft): readonly Fault[] {
  const branches = draft.branches();

  if (branches.length === 0) {
    return [{ region: 'branches', message: 'Add at least one branch.' }];
  }

  const faults: Fault[] = [];

  for (const branch of branches) {
    if (branch.name.trim() === '') {
      faults.push({
        region: 'branches',
        rowKey: branch.key,
        field: 'name',
        message: 'Give this branch a name.',
      });
    }
  }

  for (const key of duplicateKeys(branches.map((branch) => [branch.key, branch.name.trim()]))) {
    faults.push({
      region: 'branches',
      rowKey: key,
      field: 'name',
      message: 'Two branches cannot share a name. Rename one of them.',
    });
  }

  return faults;
}

function staffFaults(draft: OrganizationDraft): readonly Fault[] {
  const staff = draft.staff();

  // §4: at least one. This is a tightening of what T-30 allowed - it let a practice
  // be created with nobody in it, on the grounds that staff can be added later - and
  // the ticket is the authority on the contract. Reported in the PR.
  if (staff.length === 0) {
    return [{ region: 'staff', message: 'Add at least one staff member.' }];
  }

  const faults: Fault[] = [];

  for (const member of staff) {
    if (member.fullName.trim() === '') {
      faults.push({
        region: 'staff',
        rowKey: member.key,
        field: 'fullName',
        message: 'Give this person a name.',
      });
    }

    if (!EMAIL.test(member.email.trim())) {
      faults.push({
        region: 'staff',
        rowKey: member.key,
        field: 'email',
        message: 'Enter an email address this person can be reached at.',
      });
    }

    if (member.roles.length === 0) {
      faults.push({
        region: 'staff',
        rowKey: member.key,
        field: 'roles',
        message: 'Give this person at least one role.',
      });
    }

    if (member.branchKeys.length === 0) {
      faults.push({
        region: 'staff',
        rowKey: member.key,
        field: 'branches',
        message: 'Say which branch or branches this person works at.',
      });
    }
  }

  for (const key of duplicateKeys(
    staff.map((member) => [member.key, member.email.trim().toLowerCase()]),
  )) {
    faults.push({
      region: 'staff',
      rowKey: key,
      field: 'email',
      message: 'Two people cannot share an email address.',
    });
  }

  return faults;
}

/**
 * The keys of every row whose value another row also has - BOTH of them, not the
 * second one.
 *
 * Criteria 9 and 10 ask for both rows to be marked, and that is the honest
 * rendering: a reader shown one marked row has to find the other one themselves,
 * and there is nothing on screen to say which of the two is the mistake. (The
 * server, which sees the rows in order and answers about one of them, names the
 * second - see `EPM-ORG-002`.)
 *
 * Blank values are skipped: several unnamed rows are several rows that have not
 * been filled in yet, which the "give this branch a name" rule already reports, and
 * calling them duplicates of each other on top of that is two messages for one
 * mistake.
 */
function duplicateKeys(rows: readonly (readonly [string, string])[]): readonly string[] {
  const seenBy = new Map<string, string[]>();

  for (const [key, value] of rows) {
    if (value === '') {
      continue;
    }

    seenBy.set(value, [...(seenBy.get(value) ?? []), key]);
  }

  return [...seenBy.values()].filter((keys) => keys.length > 1).flat();
}

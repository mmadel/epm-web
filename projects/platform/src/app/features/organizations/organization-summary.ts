import { roleLabel } from './data/roles';
import { OrganizationDraft } from './organization-draft';

/**
 * The draft, read the ways the screen reads it.
 *
 * THESE ARE DERIVATIONS, NOT STATE, and they are here rather than on
 * {@link OrganizationDraft} because they answer questions about the draft in the
 * vocabulary of a SCREEN - "who works here", "what does this person do" - and turn
 * keys into the names and labels a reader sees. The draft holds keys and knows
 * nothing about how any of it is worded, which is what keeps it the one object the
 * whole console agrees on.
 *
 * They are here rather than on the page because two screens ask the same questions:
 * the branch and staff lists in the steps, and the review that reads the whole thing
 * back. Two copies of "which branches does this person work at" is two answers
 * waiting to differ.
 *
 * Plain functions over the draft rather than a service: they hold nothing, and a
 * second injectable that only reads a first one is a layer with no state in it.
 */

/**
 * One end of an assignment, named and labelled the way a reader reads it.
 *
 * THE LABEL IS RESOLVED HERE, against the row's position in the WHOLE draft - not
 * against its position among the rows that came back from a filter. An unnamed
 * branch is "Branch 3" because it is the third branch, and calling it "Branch 1"
 * because it happened to be the only one somebody works at would be a different
 * name for the same row on two screens.
 */
export interface Assignment {
  readonly key: string;
  readonly label: string;
  /** What else the row says on a tree node: a person's roles, and nothing for a branch. */
  readonly detail: string;
}

/** This staff member's roles, as a reader reads them rather than as they are sent. */
export function rolesOf(draft: OrganizationDraft, staffKey: string): string {
  return (draft.staff().find((row) => row.key === staffKey)?.roles ?? []).map(roleLabel).join(', ');
}

/** Which of the branches this staff member works at, in the order the API reads them. */
export function branchesFor(draft: OrganizationDraft, staffKey: string): readonly Assignment[] {
  const member = draft.staff().find((row) => row.key === staffKey);

  return draft
    .branches()
    .map((branch, at) => ({ branch, at }))
    .filter(({ branch }) => member?.branchKeys.includes(branch.key))
    .map(({ branch, at }) => ({
      key: branch.key,
      label: branch.name || `Branch ${at + 1}`,
      detail: '',
    }));
}

/**
 * Everyone at this branch - the direction the staff form cannot answer.
 *
 * The staff step says where each person works; a branch with nobody at it is only
 * visible from this side.
 */
export function staffAtBranch(draft: OrganizationDraft, branchKey: string): readonly Assignment[] {
  return draft
    .staff()
    .map((member, at) => ({ member, at }))
    .filter(({ member }) => member.branchKeys.includes(branchKey))
    .map(({ member, at }) => ({
      key: member.key,
      label: member.fullName || `Staff member ${at + 1}`,
      detail: rolesOf(draft, member.key),
    }));
}

// The two above, as one line of text. The lists in the steps read them this way -
// a row there is one line, and a tree is what the review makes of the same answer.

export function branchesOf(draft: OrganizationDraft, staffKey: string): string {
  return label(branchesFor(draft, staffKey));
}

export function staffAt(draft: OrganizationDraft, branchKey: string): string {
  return label(staffAtBranch(draft, branchKey));
}

function label(assignments: readonly Assignment[]): string {
  return assignments.map((assignment) => assignment.label).join(', ');
}

/** A count against a limit, or `null` when there is no limit to count against. */
export interface Counter {
  readonly used: number;
  readonly limit: number;
  readonly isOver: boolean;
}

/**
 * A count against a plan's limit.
 *
 * `null` until a plan whose limits are known is chosen - before that there is no
 * number to count against, and "3 of ?" says nothing.
 *
 * NOTHING BUILT FROM THIS BLOCKS ANYTHING. It warns; the server owns the limit and
 * answers `EPM-ORG-006` if it disagrees (T-64 §5). A console that refused at a number
 * the server would have accepted is a form nobody can send for a reason nobody can
 * see.
 */
export function counted(used: number, limit: number | undefined): Counter | null {
  return limit === undefined ? null : { used, limit, isOver: used > limit };
}

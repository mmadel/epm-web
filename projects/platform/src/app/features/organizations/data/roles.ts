import { StaffRequestRolesEnum } from 'api-client';

/** One role, as a checkbox renders it. */
export interface RoleOption {
  /** What is stored on the draft and sent. The server's own value. */
  readonly value: string;
  /** What the reader sees. Written here; the API sends no labels. */
  readonly label: string;
}

/**
 * The roles a staff member can hold - the server's set, not a list kept beside it.
 *
 * The values come from the generated enum, so a role added to the API is a
 * compile-time appearance here rather than a discovery in production, and a role
 * removed from it stops this file compiling. Until T-64 these were three invented
 * strings ("Practice admin", "Clinician", "Receptionist") that matched nothing the
 * server would accept; every one of them would have earned an `EPM-REQ-002`.
 *
 * THE LABELS ARE THE ONLY PART WRITTEN HERE, because the API sends none and no
 * message on this screen may originate from a server field (§9). `ORG_ADMIN` is
 * shown as "Org admin" rather than as its wire value for the same reason the plan
 * select shows a plan's name: a reader is choosing a job, not a constant.
 */
export const ROLE_OPTIONS: readonly RoleOption[] = [
  { value: StaffRequestRolesEnum.Doctor, label: 'Doctor' },
  { value: StaffRequestRolesEnum.Receptionist, label: 'Receptionist' },
  { value: StaffRequestRolesEnum.OrgAdmin, label: 'Org admin' },
];

/**
 * The label for a stored role value.
 *
 * A value with no option is shown as itself rather than dropped: it can only happen
 * if the draft outlived a change to the set, and a reader seeing `ORG_ADMIN` in a
 * summary can at least report it. A blank space cannot be reported.
 */
export function roleLabel(value: string): string {
  return ROLE_OPTIONS.find((role) => role.value === value)?.label ?? value;
}

/**
 * The two closed sets this console has to render as controls: the plans a practice
 * can be on, and the roles a staff member can hold.
 *
 * ============================================================================
 * THESE VALUES ARE PLACEHOLDERS AND ARE NOT THE CONTRACT.
 * ============================================================================
 *
 * The real sets are enumerated in `LLD-ORGANIZATION.md` (§2.1 for the plan, §2.5
 * for the role editor), which is not in this repository, and they will ultimately
 * come from the OpenAPI specification - which nothing generates yet (F1 §5, open
 * question 2). They are here because a control with nothing in it cannot be
 * designed against, not because anybody has agreed to them.
 *
 * The descriptions are placeholders TWICE OVER: nobody has written the copy that
 * tells a platform administrator which plan to put a practice on, and it is not
 * this console's to invent. They are what the cards would say.
 *
 * P-05 replaces this file with the real sets. Until then nothing here is sent
 * anywhere: the console has no submission path, and the last step says so.
 *
 * A reviewer looking for the thing to object to should object to this file.
 */

/** One plan, as the cards render it. */
export interface PlanOption {
  /** Stable within this file. Chooses the card's illustration; never sent. */
  readonly key: 'starter' | 'standard' | 'group';
  /** What is stored on the draft and shown everywhere the plan is named. */
  readonly name: string;
  readonly description: string;
}

/** Placeholder. See the file note. */
export const PLAN_OPTIONS: readonly PlanOption[] = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'One clinic, a small team, and the essentials.',
  },
  {
    key: 'standard',
    name: 'Standard',
    description: 'A practice running several branches and their schedules.',
  },
  {
    key: 'group',
    name: 'Clinic group',
    description: 'Many branches under one organisation, reported on together.',
  },
];

/** Placeholder. See the file note. Rendered as checkboxes over the full set. */
export const ROLE_OPTIONS = ['Practice admin', 'Clinician', 'Receptionist'] as const;

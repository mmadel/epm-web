import { Component, computed, input, linkedSignal, output } from '@angular/core';

import { ROLE_OPTIONS } from '../../data/roles';
import { BranchDraft } from '../../organization-draft';

/** What the form hands back when it is submitted. */
export interface StaffValues {
  readonly fullName: string;
  readonly email: string;
  readonly specialityCode: string;
  readonly roles: readonly string[];
  readonly branchKeys: readonly string[];
}

/**
 * The form for one staff member, whether they are being added or edited.
 *
 * IT HOLDS ITS OWN VALUES until somebody presses the button, so the list beside it
 * is a list of people who are on the draft rather than a list of rows being typed
 * into. Cancel leaves nothing behind, because the draft was never touched.
 *
 * BRANCHES ARE CHOSEN BY KEY. They are keys the whole way through - here, on the
 * draft, and everywhere else - and become positions once, at submit time. See the
 * note on `OrganizationDraft`; getting this wrong is the defect the milestone calls
 * the most likely to ship.
 */
@Component({
  selector: 'app-staff-form',
  templateUrl: './staff-form.html',
  styleUrl: './staff-form.scss',
})
export class StaffForm {
  /** The branches to choose from, so the form never guesses what exists. */
  readonly branches = input.required<readonly BranchDraft[]>();

  readonly initialFullName = input<string>('');
  readonly initialEmail = input<string>('');
  readonly initialSpecialityCode = input<string>('');
  readonly initialRoles = input<readonly string[]>([]);
  readonly initialBranchKeys = input<readonly string[]>([]);

  readonly submitLabel = input<string>('Add staff member');

  readonly submitted = output<StaffValues>();
  readonly cancelled = output<void>();

  protected readonly roleOptions = ROLE_OPTIONS;

  // `linkedSignal` rather than plain signals seeded in the constructor: an input is
  // not bound yet when a field initialiser runs, so an edit form would open empty.
  protected readonly fullName = linkedSignal(() => this.initialFullName());
  protected readonly email = linkedSignal(() => this.initialEmail());
  protected readonly specialityCode = linkedSignal(() => this.initialSpecialityCode());
  protected readonly roles = linkedSignal<readonly string[]>(() => this.initialRoles());
  protected readonly branchKeys = linkedSignal<readonly string[]>(() => this.initialBranchKeys());

  /** A name, an email, at least one role and at least one branch (P-05.3). */
  protected readonly canSubmit = computed(
    () =>
      this.fullName().trim().length > 0 &&
      this.email().trim().length > 0 &&
      this.roles().length > 0 &&
      this.branchKeys().length > 0,
  );

  protected onFullName(event: Event): void {
    this.fullName.set((event.target as HTMLInputElement).value);
  }

  protected onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onSpecialityCode(event: Event): void {
    this.specialityCode.set((event.target as HTMLInputElement).value);
  }

  protected toggleRole(role: string): void {
    this.roles.update((roles) =>
      roles.includes(role) ? roles.filter((at) => at !== role) : [...roles, role],
    );
  }

  protected toggleBranch(key: string): void {
    this.branchKeys.update((keys) =>
      keys.includes(key) ? keys.filter((at) => at !== key) : [...keys, key],
    );
  }

  protected has(list: readonly string[], value: string): boolean {
    return list.includes(value);
  }

  protected onSubmit(): void {
    if (this.canSubmit()) {
      this.submitted.emit({
        fullName: this.fullName().trim(),
        email: this.email().trim(),
        specialityCode: this.specialityCode().trim(),
        roles: this.roles(),
        branchKeys: this.branchKeys(),
      });
    }
  }
}

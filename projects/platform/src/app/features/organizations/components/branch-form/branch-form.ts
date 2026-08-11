import { Component, computed, input, linkedSignal, output } from '@angular/core';

/** What the form hands back when it is submitted. */
export interface BranchValues {
  readonly name: string;
  readonly phone: string;
}

/**
 * The form for one branch, whether it is being added or edited.
 *
 * IT HOLDS ITS OWN VALUES until somebody presses the button. That is the whole
 * point of the shape: the list beside it is a list of branches that exist on the
 * draft, and a half-typed name is not a branch. Before this, every row was a live
 * form writing straight through to the draft, so a list of what had been added was
 * indistinguishable from a list of what was being typed.
 *
 * CANCEL IS NOT A NO-OP. Adding leaves nothing behind and editing puts back what
 * was there, because the draft was never touched.
 */
@Component({
  selector: 'app-branch-form',
  templateUrl: './branch-form.html',
  styleUrl: './branch-form.scss',
})
export class BranchForm {
  readonly initialName = input<string>('');
  readonly initialPhone = input<string>('');

  /** `Add branch` or `Save changes` - the same form does both jobs. */
  readonly submitLabel = input<string>('Add branch');

  readonly submitted = output<BranchValues>();
  readonly cancelled = output<void>();

  // `linkedSignal` rather than a plain one seeded in the constructor: an input is
  // not bound yet when a field initialiser runs, so a plain signal would open every
  // edit form empty.
  protected readonly name = linkedSignal(() => this.initialName());
  protected readonly phone = linkedSignal(() => this.initialPhone());

  /** A branch is its name. The phone is optional (P-05.2). */
  protected readonly canSubmit = computed(() => this.name().trim().length > 0);

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onPhone(event: Event): void {
    this.phone.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(): void {
    if (this.canSubmit()) {
      this.submitted.emit({ name: this.name().trim(), phone: this.phone().trim() });
    }
  }
}

import { Component, computed, input, output } from '@angular/core';

/**
 * Where a step is in the flow.
 *
 * `done` and `upcoming` are not "complete" and "incomplete": a step you have not
 * reached yet is upcoming even if there is nothing in it to fill in, and the step
 * you are on is neither of the two however finished it is.
 */
export type StepState = 'done' | 'current' | 'upcoming';

/**
 * One step of the flow: a numbered heading that is also the control that opens it,
 * and the panel it opens.
 *
 * THE FINISHED STEPS STAY ON THE SCREEN. A step that is done collapses to its
 * summary - "Cairo Physio · Standard plan" - rather than disappearing, so the
 * organization assembles itself down the page as it is filled in and the reader
 * never has to go back to check what they said. That is the whole difference
 * between this and a wizard that shows one screen at a time.
 *
 * IT IS A DISCLOSURE, NOT A TAB PANEL. The heading is a `button` with
 * `aria-expanded` and `aria-controls`, which is the pattern a screen reader
 * already knows; `role="tab"` would bring a keyboard contract with it - arrow keys
 * moving between headers, one tab stop for the set - that is wrong for a sequence
 * somebody works down in order.
 *
 * A LOCKED STEP IS STILL FOCUSABLE. `aria-disabled` rather than `disabled`,
 * because a control that cannot be tabbed to is a control a keyboard user cannot
 * discover, and "Staff, step 3 of 4, not started" is worth reaching even when
 * pressing it does nothing yet.
 */
@Component({
  selector: 'app-step',
  templateUrl: './step.html',
  styleUrl: './step.scss',
})
export class Step {
  /** Its place in the flow, from 1. Shown in the marker and used for the ids. */
  readonly number = input.required<number>();

  readonly title = input.required<string>();

  readonly state = input.required<StepState>();

  /**
   * The one line a finished step collapses to. It is read out as part of the
   * heading's accessible name, so it says what was entered rather than how much:
   * "3 branches · Maadi, Nasr City, Zamalek", never "3 items".
   */
  readonly summary = input<string>('');

  readonly open = input<boolean>(false);

  /** Whether opening it is refused, because an earlier step is not finished. */
  readonly locked = input<boolean>(false);

  readonly toggled = output<void>();

  protected readonly panelId = computed(() => `step-panel-${this.number()}`);
  protected readonly headingId = computed(() => `step-heading-${this.number()}`);

  protected onToggle(): void {
    if (!this.locked()) {
      this.toggled.emit();
    }
  }
}

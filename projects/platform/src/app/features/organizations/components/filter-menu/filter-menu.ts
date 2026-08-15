import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';

import { Facet } from '../../data/practice-criteria';

/**
 * One criterion, as a control that says what it is set to and opens to change it.
 *
 * THE COUNTS SURVIVED THE MOVE, AND THAT WAS THE CONDITION. This replaces a row of
 * chips per group, which was honest and enormous - five groups of them was a third
 * of the screen before a single practice appeared. What it is NOT is a `<select>`:
 * the native control cannot hold "Active and Suspended" without a multiple-select
 * box nobody can use, and it cannot put `Suspended 2` beside an option at all. The
 * facet count is the best thing on this screen and it is not being traded for
 * furniture.
 *
 * THE TRIGGER SAYS WHAT IS CHOSEN, not just what the group is. `Status: Active` -
 * or `Status: 2` when two are - because a menu that reads "Status" whatever is
 * inside it makes the reader open it to find out what their own screen is doing.
 *
 * IT CLOSES ON ESCAPE AND ON THE NEXT CLICK ANYWHERE ELSE, and Escape puts focus
 * back on the trigger. A panel that can only be dismissed by pressing the exact
 * control that opened it is a panel that gets left open.
 */
@Component({
  selector: 'app-filter-menu',
  templateUrl: './filter-menu.html',
  styleUrl: './filter-menu.scss',
  host: {
    '(document:click)': 'onClickAnywhere($event)',
    '(keydown.escape)': 'close()',
  },
})
export class FilterMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** What the group is called: `Status`, `Plan`, `Size`. */
  readonly label = input.required<string>();

  readonly options = input.required<readonly Facet[]>();

  /**
   * Whether more than one option may be chosen.
   *
   * A status or a plan takes several - "suspended or closed" is one question about
   * which practices need looking at. A size threshold takes one, because "at least
   * two or at least five" is not a question anybody has.
   */
  readonly isMultiple = input(true);

  /** What the "no answer" option says: `Any status`, `Any size`. */
  readonly anyLabel = input('Any');

  /** How many practices are left when this group is not narrowing anything. */
  readonly anyCount = input<number | undefined>(undefined);

  readonly chose = output<string>();

  readonly cleared = output<void>();

  protected readonly isOpen = signal(false);

  /** The chosen options, which is what the trigger says. */
  private readonly chosen = computed(() => this.options().filter((option) => option.isOn));

  protected readonly summary = computed(() => {
    const chosen = this.chosen();

    if (chosen.length === 0) {
      return this.anyLabel();
    }

    // One is named; two or more are counted. Three plan names in a control this size
    // is a control that changes width as it is used.
    return chosen.length === 1 ? chosen[0].label : `${chosen.length} chosen`;
  });

  protected readonly count = computed(() => this.chosen().length);

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected close(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.trigger()?.focus();
    }
  }

  /**
   * A click somewhere else on the page shuts it.
   *
   * `composedPath` rather than `contains`, because the option that was clicked may
   * have been removed from the DOM by the time this runs - a count reaching zero
   * disables it, and a disabled control inside a menu that is checking whether the
   * click was inside itself would fail that check and shut the menu mid-use.
   */
  protected onClickAnywhere(event: Event): void {
    if (this.isOpen() && !event.composedPath().includes(this.host.nativeElement as HTMLElement)) {
      this.isOpen.set(false);
    }
  }

  private trigger(): HTMLButtonElement | null {
    return (this.host.nativeElement as HTMLElement).querySelector('.menu__trigger');
  }
}

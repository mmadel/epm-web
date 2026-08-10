import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The console's one primary action: add a practice.
 *
 * A solid accent pill with the plus set in an inset white tile. THE PLUS IS THE
 * MEDICAL CROSS DOING DOUBLE DUTY - it is both "add" and the mark of the domain,
 * which is why it is drawn as a deliberate object in a tile rather than a thin
 * icon floating beside the label. A building glyph was rejected: the label
 * already names the noun, so it would carry no information.
 *
 * THE PILL SHAPE IS RESERVED for a status and for the single primary action on a
 * screen, so the shape itself signals "this is the main thing" - and a second
 * pill-shaped button on a screen becomes a design error anyone can spot.
 *
 * IT NEVER COLLAPSES TO ICON-ONLY. 1024px is the supported floor and there is
 * room; the tile is `aria-hidden` and the label is the accessible name.
 *
 * It is a link rather than a button because it goes somewhere - the onboarding
 * screen, P-05 - and a control that navigates should be openable in a new tab.
 */
@Component({
  selector: 'app-add-practice-button',
  imports: [RouterLink],
  templateUrl: './add-practice-button.html',
  styleUrl: './add-practice-button.scss',
})
export class AddPracticeButton {
  /** Where it goes. Supplied by the screen, so this component names no route. */
  readonly link = input.required<string>();

  /**
   * The larger of the two sizes, for the empty state where the button is the
   * only thing on the screen to do.
   */
  readonly large = input(false);
}

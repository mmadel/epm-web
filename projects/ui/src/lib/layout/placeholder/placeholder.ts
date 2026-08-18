import { Component, input } from '@angular/core';

/**
 * A screen that has a route and a name but no content yet.
 *
 * It exists so that "not built" is a state the product renders rather than an
 * empty content region, which is indistinguishable from a screen that failed to
 * load. It says what the screen will be and that it is not there yet, in that
 * order, because the first half is what tells a reader they navigated correctly.
 *
 * It is in `ui` rather than in an application because more than one thing needs
 * it and none of them owns it: the sections of the staff console before their
 * own tickets fill them, the content region while a lazily loaded chunk is in
 * flight, and the screen an unmatched address renders. Projected content is
 * appended after the sentence, which is how the unmatched-address screen adds a
 * way out without a second component.
 *
 * NO TRANSLATION HAPPENS HERE. Both strings arrive resolved - see {@link Shell}.
 */
@Component({
  selector: 'lib-placeholder',
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.scss',
})
export class Placeholder {
  /** What the screen is, already in the language the host wants. */
  readonly heading = input.required<string>();

  /** Why there is nothing on it, already in the language the host wants. */
  readonly body = input.required<string>();
}

import { Component, input } from '@angular/core';

/**
 * The block every screen opens with: its title, one line under it, and at most one
 * action.
 *
 * IT EXISTS SO THAT NO SCREEN AUTHOR DECIDES WHAT A HEADER LOOKS LIKE. The platform
 * console had a good one and it lived in `platform`, which meant the four staff
 * sections would each have invented their own and none of the five would have been
 * the one to standardise on. This is that header, moved.
 *
 * THE TITLE IS AN INPUT AND NOT A ROUTE TITLE. The platform console takes its
 * heading from the route so that the browser tab and the page cannot disagree, which
 * is a good rule and is still that console's - it passes the route's title in. What
 * it cannot be is this component's rule: reading `ActivatedRoute` here would tie
 * `ui` to the router, and the staff console has no route titles at all, because a
 * title in a route table is the one string in a bilingual product that stays English
 * after a language switch.
 *
 * NO TRANSLATION HAPPENS HERE, for the same reason it does not in {@link Shell}:
 * both strings arrive resolved. A `TranslatePipe` inside would make every consumer's
 * key namespace this component's business.
 *
 * ONE ACTION, AND THE SLOT TAKES ONE. Two is a hierarchy, and a hierarchy decided
 * per screen is the thing this component exists to prevent. A second slot is a
 * decision to raise, not a change to make.
 */
@Component({
  selector: 'lib-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  /**
   * The screen's name, already in the language the host wants.
   *
   * Required, and with no default: a header with no title is a screen with no name,
   * and an empty string passed deliberately is a different thing from a component
   * that quietly allowed one.
   */
  readonly title = input.required<string>();

  /**
   * One line under the title - a count, or a fact. Never a description of what the
   * screen obviously is.
   *
   * Absent renders no element at all rather than an empty one, which is what keeps
   * the title on the same baseline whether or not a screen has something to add.
   */
  readonly supporting = input<string>('');
}

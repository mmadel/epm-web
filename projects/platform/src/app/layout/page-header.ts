import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ROUTE_PATHS } from '../route-paths';

/**
 * The white band at the top of a screen: the page's title, one line of
 * supporting text, and at most one action.
 *
 * THE TITLE COMES FROM THE ROUTE, not from an input. The route already declares
 * one - the document title needs it - and a screen that declared its heading
 * separately would be a screen where the tab and the page can disagree. There is
 * exactly one `h1` per page, and this is it.
 *
 * The heading carries `tabindex="-1"` because the frame moves focus here after
 * every completed navigation; without it the browser would refuse and focus
 * would stay on whatever was clicked.
 *
 * THE BACK LINK IS WHAT REPLACES A TAB BAR. Any screen that is not the list
 * offers one, above the title, reading `Practices`. Moving between the two
 * screens costs back-then-forward rather than one click; for a form that takes
 * minutes and ends by navigating to the list anyway, that is not a real cost.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  private readonly route = inject(ActivatedRoute);

  /**
   * One line under the title. A count, or a fact - never a description of what
   * the screen obviously is. Omitted rather than filled with something.
   */
  readonly subtitle = input<string>('');

  /** Whether to offer the way back to the practice list. */
  readonly back = input(false);

  protected readonly homeLink = ROUTE_PATHS.practices;

  /**
   * The route's title. `''` until the router resolves it, which renders an empty
   * heading rather than a placeholder - a page whose route forgot its title
   * should look wrong, not look finished.
   */
  protected readonly title = toSignal(this.route.title, { initialValue: '' });
}

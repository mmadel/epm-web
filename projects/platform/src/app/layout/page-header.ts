import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/**
 * The heading block at the top of a screen: its title, one line of supporting
 * text, and at most one action.
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
 * THERE IS NO BACK LINK. There used to be one, reading `Practices`, because the
 * console had a landing screen and no navigation; the stage tabs in the frame are
 * now the way between screens, and a back link beside them would be a second,
 * quieter answer to a question the tabs already answer.
 */
@Component({
  selector: 'app-page-header',
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

  /**
   * The route's title. `''` until the router resolves it, which renders an empty
   * heading rather than a placeholder - a page whose route forgot its title
   * should look wrong, not look finished.
   */
  protected readonly title = toSignal(this.route.title, { initialValue: '' });
}

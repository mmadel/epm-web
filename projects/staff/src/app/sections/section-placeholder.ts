import { Component, input } from '@angular/core';
import { Placeholder, TranslatePipe } from 'ui';

/**
 * What every section renders until its own ticket fills it.
 *
 * ONE COMPONENT BEHIND FOUR TABS, and that is the point of this sub-task rather
 * than a shortcut through it. What T-97b owes is a navigation whose entries are
 * reachable and whose active state comes from the router; four components at this
 * stage would be four files to delete in T-97c, which replaces each of them with
 * the lazily loaded section that ticket owns.
 *
 * IT KNOWS WHICH SECTION IT IS FROM THE ROUTE AND NOWHERE ELSE. The name arrives
 * as `data.section` on the route, bound to the input below by
 * `withComponentInputBinding` (see app.config.ts). Nothing here holds a copy of
 * "which section am I in" - T-97 §5 - so the tab, the heading and the address can
 * never disagree.
 *
 * The string goes through the pipe rather than being resolved in a field: the pipe
 * is impure and reads the language signal, so switching language rewrites the
 * screen with no reload. A field would be resolved once, at construction, and a
 * routed component is not rebuilt when the language changes.
 */
@Component({
  selector: 'app-section-placeholder',
  imports: [Placeholder, TranslatePipe],
  templateUrl: './section-placeholder.html',
})
export class SectionPlaceholder {
  /**
   * The translation key naming this section, from the route's own `data`.
   *
   * Required, so a route added without one fails loudly at that route rather than
   * rendering a screen with an empty heading that nobody notices until it ships.
   */
  readonly section = input.required<string>();
}

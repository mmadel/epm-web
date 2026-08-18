import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

/**
 * The current route's title, as a signal.
 *
 * THE HEADING COMES FROM THE ROUTE IN THIS CONSOLE, and that is the rule this
 * function exists to keep. The route already declares a title - the browser tab
 * needs it - and a screen that declared its heading separately would be a screen
 * where the tab and the page can disagree.
 *
 * It used to live inside this console's own `PageHeader`, which is why that
 * component could not be shared: reading `ActivatedRoute` in `ui` would tie the
 * library to the router, and the staff console has no route titles at all - a title
 * in a route table is the one string in a bilingual product that stays English after
 * a language switch. So the header moved to `ui` and the rule stayed here, which is
 * a function rather than a component because a rule is all that was left of it.
 *
 * `''` UNTIL THE ROUTER RESOLVES A TITLE, AND `''` IF IT NEVER DOES. That renders an
 * empty heading rather than a placeholder: a screen whose route forgot its title
 * should look wrong, because it is.
 *
 * The `undefined` a route with no title emits is mapped away here rather than left
 * for each caller, because `lib-page-header` requires a string - and "the route
 * declared no title" and "the title is empty" are the same thing to a reader looking
 * at the screen.
 */
export function routeTitle() {
  return toSignal(inject(ActivatedRoute).title.pipe(map((title) => title ?? '')), {
    initialValue: '',
  });
}

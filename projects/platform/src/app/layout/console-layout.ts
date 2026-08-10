import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SESSION_SOURCE } from 'core';
import { Shell } from 'ui';
import { filter } from 'rxjs';

import { ENVIRONMENT_NAME } from '../environment/environment-name';
import { ROUTE_PATHS } from '../route-paths';
import { EnvironmentChip } from './environment-chip';
import { environmentPresentation } from './environment-presentation';

/** The initials shown in the account mark, from a display name. */
export function initialsOf(displayName: string): string {
  const words = displayName.split(/\s+/).filter((word) => word.length > 0);

  // First and last, so "Mona Adel Hassan" reads MH rather than MA. One word
  // gives one letter; nothing gives nothing, and the mark renders empty rather
  // than rendering a placeholder that looks like somebody's initials.
  return [words.at(0), words.length > 1 ? words.at(-1) : undefined]
    .filter((word) => word !== undefined)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * The platform console's frame.
 *
 * It mounts `ui`'s shell rather than being a second one, and fills the three
 * slots that shell projects: the edge strip above the header, the brand at the
 * start of the header, and the environment and account at the end of it.
 *
 * THERE IS NO NAVIGATION, and no `nav` landmark. A tab bar with `Practices` and
 * `Add a practice` was rejected in design review: `Practices` is a place and
 * `Add a practice` is an action, so a tab bar models them as two places - you
 * can be "on" the action the way you are on a page - and it puts the console's
 * most consequential operation in the quietest object on screen. The wordmark is
 * therefore the route home, and every screen that is not the list carries a back
 * link where the tab bar would have been.
 *
 * NOTHING HERE READS THE LANGUAGE SERVICE. This console is English-only and
 * LTR-only (P-03.2), the strings are written in the templates, and there is no
 * slot in the header where a language switch could later appear without somebody
 * deciding to put one there.
 *
 * FOCUS. Angular's router does not move focus on navigation, so a keyboard or
 * screen-reader user who follows a link stays wherever they were and hears
 * nothing. This moves focus to the new page's `h1` and announces its text
 * politely. It is done here rather than in each page because "every completed
 * navigation" is a fact about the frame, and a page that forgot would fail
 * silently.
 */
@Component({
  selector: 'app-console-layout',
  imports: [Shell, RouterLink, EnvironmentChip],
  templateUrl: './console-layout.html',
  styleUrl: './console-layout.scss',
})
export class ConsoleLayout {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  /** Who is signed in. Read through the seam; never resolved here (P-02). */
  private readonly session = inject(SESSION_SOURCE).session;

  protected readonly homeLink = ROUTE_PATHS.practices;

  /**
   * How this environment is presented. The layout uses two of its three fields:
   * whether the page carries the edge strip, and which tone that strip wears.
   */
  private readonly environment = environmentPresentation(inject(ENVIRONMENT_NAME));

  /**
   * The edge strip's classes. Only the tone modifier gives it a height, so an
   * environment that does not carry an edge leaves an element with nothing in it
   * rather than needing the element to disappear - see console-layout.html for
   * why it cannot simply be wrapped in an `@if`.
   */
  protected readonly edgeClass = this.environment.edge
    ? `console-edge console-edge--${this.environment.tone}`
    : 'console-edge';

  /** The signed-in administrator's full name, for the account mark's tooltip. */
  protected readonly accountName = this.session().displayName;

  /** Their initials, which is all the mark shows. There is no menu behind it. */
  protected readonly accountInitials = initialsOf(this.accountName);

  /**
   * What the live region says. Empty until the first navigation completes, so
   * the region does not announce the landing page on top of the page load.
   */
  protected readonly announcement = signal('');

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      // `afterNextRender` rather than acting on the event directly: at
      // NavigationEnd the outlet has been activated but the new page's view has
      // not been rendered yet, so its `h1` is not in the document to focus.
      .subscribe(() => afterNextRender(() => this.onNavigated(), { injector: this.injector }));
  }

  private onNavigated(): void {
    const heading = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('main h1');

    if (heading === null) {
      return;
    }

    heading.focus();
    this.announcement.set(heading.textContent?.trim() ?? '');
  }
}

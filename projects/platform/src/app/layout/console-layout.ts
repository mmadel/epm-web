import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SESSION_SOURCE } from 'core';
import { Shell, Wordmark } from 'ui';
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
 * THERE IS STILL NO NAVIGATION BAND, and no `nav` landmark, now that there are two
 * screens. A tab bar was tried here twice - first with `Practices` and `Add a
 * practice` in it, which is a place beside an action, and later with the parts of
 * the practice, which was navigation for a form you can read in one scroll and hid
 * fields from the server errors that name them (P-05.7). Neither is worth
 * reviving for two screens that are already a place and the task opened from it:
 * the list carries the one control that opens onboarding, and the wordmark is the
 * way back to the list from anywhere. A band of two entries, one of which is
 * always where you already are, is chrome that says nothing.
 *
 * THE WORDMARK GOES TO THE PRACTICE LIST, which is the console's home. It used to
 * go to `/onboard` because that was the only screen there was.
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
 *
 * A CHANGE OF QUERY IS NOT A CHANGE OF SCREEN, and that exception is the whole of
 * `onNavigated`'s first half. The practice list keeps its search and its page
 * number in the address (design §6), so typing four letters into its search box is
 * four completed navigations - and moving focus for each of them took the caret out
 * of the box the reader was still typing into, one keystroke after they paused, and
 * read the page title over the top of them. Nobody went anywhere: the heading is
 * the same heading, and what changed is a list under it that says what it found in
 * its own live region.
 */
@Component({
  selector: 'app-console-layout',
  imports: [Shell, Wordmark, EnvironmentChip],
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

  /**
   * Whether a navigation has already completed.
   *
   * THE FIRST ONE IS NOT A NAVIGATION. It is the page loading, and nobody went
   * anywhere: moving focus for it leaves a ring drawn around the heading of the
   * screen the reader has just arrived at, which looks like a rendering fault, and
   * announcing it talks over the page load. The live region was already empty
   * until the second navigation for that reason; the focus move was not, and the
   * ring was visible in every screenshot of this console.
   */
  private hasNavigated = false;

  /** The path last arrived at, with whatever was after the `?` taken off. */
  private lastPath: string | undefined;

  private onNavigated(): void {
    const path = pathOf(this.router.url);
    const isSameScreen = path === this.lastPath;

    this.lastPath = path;

    if (!this.hasNavigated) {
      this.hasNavigated = true;

      return;
    }

    // A search, a page turn, or a change of page size: the screen is the one the
    // reader is already on and the address is how it holds its state. Taking focus
    // for that is taking it out of the control they are using.
    if (isSameScreen) {
      return;
    }

    const heading = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('main h1');

    if (heading === null) {
      return;
    }

    heading.focus();
    this.announcement.set(heading.textContent?.trim() ?? '');
  }
}

/**
 * A URL without its query or its fragment: which screen, rather than what that
 * screen is currently showing.
 *
 * String work rather than `UrlTree`, because the question is only "is this the same
 * screen", and `router.url` is already the serialised address the reader would copy.
 */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}

import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { LanguageSwitch, Placeholder, Shell, TranslatePipe, Wordmark } from 'ui';

import { ROUTE_PATHS } from './route-paths';

/**
 * The staff console's frame.
 *
 * THERE IS NO NAVIGATION BAND, and that is a decision rather than something not
 * built yet. With five areas and a home screen carrying a card into each one, a rail
 * beside the content repeated every link on that screen and took a fixed column of
 * the window on every other one. `Shell` renders no landmark when it is given no
 * navigation - the platform console mounts it the same way - so the frame is a
 * header and a content region.
 *
 * WHAT REPLACES IT IS THE WORDMARK. It is the route home from every screen, which
 * makes it load-bearing in a way it was not while a rail existed: the way to any
 * area is home, then the card. That is one click more than a rail costs, and what it
 * buys is the whole width of the window on every screen in the console.
 *
 * If the console outgrows what a home screen can hold - patients, appointments and
 * billing are its too - this is the decision to revisit. `Shell` still takes a
 * `navigation` input and `shell-nav.spec.ts` still holds it to its behaviour, so
 * revisiting it means passing an array rather than rebuilding a frame.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Shell, Wordmark, LanguageSwitch, Placeholder, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  /**
   * Where the wordmark goes, which is where `/` goes: this console's home screen.
   *
   * IT IS THE ONLY WAY BACK from any other screen now that there is no rail. It
   * pointed at `/practice` while it was one affordance among several, which was
   * already wrong and would now be a dead end.
   */
  protected readonly home = ROUTE_PATHS.home;

  /**
   * Whether a navigation is in flight - which, for every section, means a chunk is
   * being fetched.
   *
   * THE FRAME STAYS AND ONLY THE CONTENT REGION WAITS. Replacing the whole page while
   * a lazy chunk loads makes a route change look like a reload, and the header is the
   * one thing on the screen that says which console this is.
   *
   * It is driven by the router's own events rather than by anything a route declares,
   * so a section added later is covered without being told to be. A chunk the browser
   * already has resolves inside the same task, so the placeholder never paints for it
   * - the wait is only ever shown for a wait that is real.
   */
  protected readonly loading = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Cancelled and failed navigations end the wait as surely as a completed one.
        // Without them, a guard that redirects would leave the console showing a
        // placeholder for a screen that was never coming.
        this.loading.set(false);
      }
    });
  }
}

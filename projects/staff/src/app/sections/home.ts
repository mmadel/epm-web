import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from 'ui';

import { ROUTE_PATHS } from '../route-paths';

/**
 * One area of the console, as it appears on the home screen.
 *
 * The `mark` is which glyph the card carries. It is a key rather than a path
 * because the paths live in the template - an SVG in a TypeScript string is an
 * SVG nobody will ever edit - and a key is what lets the template pick one.
 */
interface Area {
  readonly nameKey: string;
  readonly summaryKey: string;
  readonly link: string;
  readonly mark: 'practice' | 'clinics' | 'staff' | 'subscription';
}

/**
 * Where a signed-in staff member lands: one card per area of the console.
 *
 * IT IS A WAY IN, NOT A REPORT. Every card is a link and nothing on this screen is
 * fetched - T-97 §4, the shell calls nothing - so the landing page ships with the
 * shell rather than waiting on four sections' worth of data. What each card carries
 * today is the only thing the console can honestly say without asking the backend:
 * what that area is FOR.
 *
 * IT IS NOT THE RAIL A SECOND TIME. The rail is how a person moves once they know
 * the console; this is how they learn it. That is why a card carries a glyph and a
 * sentence and a rail entry carries a word - four names in four boxes would be a
 * screen with nothing on it.
 *
 * IT IS NOT CALLED A DASHBOARD, and that is the point of the name. A dashboard is a
 * reading of numbers; this is a set of controls. When figures do arrive - seats
 * used, clinics on the plan - they belong on these cards, and the screen will still
 * be the same thing it is now.
 *
 * THE AREAS ARE LISTED HERE rather than derived from the route table, so a section
 * that gains a route has to be added deliberately. A home screen built from the
 * routes would silently grow a card for the unknown-route screen.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  /**
   * The areas this console offers, in the rail's order.
   *
   * The name key is the SAME ONE the rail and the area's own heading use - one name,
   * one string - and the summary is this screen's alone, because nowhere else has
   * room for a sentence.
   */
  protected readonly areas: readonly Area[] = [
    {
      nameKey: 'shell.section.practice',
      summaryKey: 'shell.summary.practice',
      link: ROUTE_PATHS.practice,
      mark: 'practice',
    },
    {
      nameKey: 'shell.section.clinics',
      summaryKey: 'shell.summary.clinics',
      link: ROUTE_PATHS.clinics,
      mark: 'clinics',
    },
    {
      nameKey: 'shell.section.staff',
      summaryKey: 'shell.summary.staff',
      link: ROUTE_PATHS.staff,
      mark: 'staff',
    },
    {
      nameKey: 'shell.section.subscription',
      summaryKey: 'shell.summary.subscription',
      link: ROUTE_PATHS.subscription,
      mark: 'subscription',
    },
  ];
}

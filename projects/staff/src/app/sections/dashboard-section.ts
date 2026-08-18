import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from 'ui';

import { ROUTE_PATHS } from '../route-paths';

/**
 * Where a signed-in staff member lands: one card per area of the console.
 *
 * IT IS A WAY IN, NOT A REPORT. Every card is a link and nothing on this screen
 * is fetched - T-97 §4, the shell calls nothing - so the landing page ships with
 * the shell rather than waiting on four sections' worth of data. What each card
 * carries today is the only thing the console can honestly say without asking the
 * backend: what that area is FOR.
 *
 * IT IS NOT A SECOND NAVIGATION. The rail is how you move once you know the
 * console; this is how you learn it. That is why a card says a sentence and a rail
 * entry says a word, and it is why the cards carry summaries rather than repeating
 * the four names in a grid - a grid of the same words the rail already shows would
 * be a screen with nothing on it.
 *
 * THE CARDS ARE BUILT FROM `ROUTE_PATHS`, so a section that gains a route and a
 * name has to be added here deliberately. A landing page derived from the route
 * table would silently grow a card for the unknown-route screen.
 */
@Component({
  selector: 'app-dashboard-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './dashboard-section.html',
  styleUrl: './dashboard-section.scss',
})
export class DashboardSection {
  /**
   * The areas this console offers, in the rail's order.
   *
   * The name key is the SAME ONE the rail and the section's own heading use - one
   * name, one string - and the summary is this screen's alone, because nowhere else
   * has room for a sentence.
   */
  protected readonly areas = [
    {
      nameKey: 'shell.section.practice',
      summaryKey: 'shell.summary.practice',
      link: ROUTE_PATHS.practice,
    },
    {
      nameKey: 'shell.section.clinics',
      summaryKey: 'shell.summary.clinics',
      link: ROUTE_PATHS.clinics,
    },
    {
      nameKey: 'shell.section.staff',
      summaryKey: 'shell.summary.staff',
      link: ROUTE_PATHS.staff,
    },
    {
      nameKey: 'shell.section.subscription',
      summaryKey: 'shell.summary.subscription',
      link: ROUTE_PATHS.subscription,
    },
  ] as const;
}

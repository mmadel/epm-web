import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from 'ui';

import { ROUTE_PATHS } from '../route-paths';
import { routeTitle } from './route-title';

/**
 * What an unmatched URL renders.
 *
 * IT IS NOT A REDIRECT. A silent redirect home turns a broken link into a working
 * one, so the bookmark nobody can open and the typo in a support thread both look
 * fine and get reported as "it works for me". The frame stays, the title says
 * what happened, and there is one link out.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [PageHeader, RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
})
export class NotFoundPage {
  /**
   * The screen's heading, taken from the route so that the browser tab and the page
   * cannot disagree - see `routeTitle`. It is passed to `lib-page-header` rather
   * than read inside it, because that component is shared with a console that has no
   * route titles at all.
   */
  protected readonly title = routeTitle();

  protected readonly homeLink = ROUTE_PATHS.practices;
}

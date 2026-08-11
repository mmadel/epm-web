import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROUTE_PATHS } from '../route-paths';
import { PageHeader } from './page-header';

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
  protected readonly homeLink = ROUTE_PATHS.onboard;
}

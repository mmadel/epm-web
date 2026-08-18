import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Placeholder, TranslatePipe } from 'ui';

import { ROUTE_PATHS } from '../route-paths';

/**
 * What an address that matches no screen renders.
 *
 * IT IS NOT A REDIRECT. A silent redirect home turns a broken link into a working
 * one, so the bookmark nobody can open and the typo in a support thread both look
 * fine and get reported as "it works for me". The address stays, and the screen
 * says what happened.
 *
 * IT RENDERS INSIDE THE SHELL, NEVER AS A BARE PAGE, which is why this is a
 * routed component under the same outlet as every section rather than something
 * the application swaps its whole template for. The header and the navigation
 * stay: a dead end with no way out is how a person ends up reloading the
 * application to escape it.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [Placeholder, RouterLink, TranslatePipe],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
})
export class NotFoundPage {
  /**
   * The way out, offered in the screen as well as by the navigation around it.
   *
   * The navigation is the general answer and this is the specific one: a person
   * who has just been told the address is wrong should not have to work out which
   * of the entries beside it was the one they meant.
   */
  protected readonly homeLink = ROUTE_PATHS.practice;
}

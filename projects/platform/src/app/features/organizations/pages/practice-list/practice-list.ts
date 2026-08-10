import { Component } from '@angular/core';

import { PageHeader } from '../../../../layout/page-header';
import { ROUTE_PATHS } from '../../../../route-paths';
import { AddPracticeButton } from '../../components/add-practice-button';

/**
 * The landing screen: every practice on the platform.
 *
 * P-04 IS BLOCKED AND THIS SCREEN STOPS AT THE EMPTY STATE. There is no route
 * behind the list - `GET /platform/organizations` does not exist and has not
 * been agreed (MILESTONE-F1-PLATFORM.md §5) - so this ships the page header, the
 * add button and the empty state, and nothing that reads data.
 *
 * THE EMPTY STATE IS NOT CONDITIONAL. There is no list route, so there is no
 * count to branch on; it renders unconditionally until P-04 unblocks. A
 * `hasItems` check against a mock would mean transcribing a proposed response
 * shape into the client, and that is how a proposal becomes a contract before
 * anybody signs it off.
 *
 * The blocked note on the screen ships with it. This is the only screen in the
 * console and somebody will demo it; a line naming the ticket is cheaper than
 * the conversation about the missing table, and it is deleted by the first line
 * of P-04.
 */
@Component({
  selector: 'app-practice-list',
  imports: [PageHeader, AddPracticeButton],
  templateUrl: './practice-list.html',
  styleUrl: './practice-list.scss',
})
export class PracticeList {
  protected readonly onboardLink = ROUTE_PATHS.addPractice;
}

import { Component } from '@angular/core';
import { Placeholder, TranslatePipe } from 'ui';

/**
 * Where a signed-in staff member lands.
 *
 * IT IS EMPTY ON PURPOSE AND IT IS NOT ONE OF T-97'S FOUR SECTIONS. The dashboard
 * is the console's front door rather than a face of the practice's record, so it
 * has its own component from the start instead of sharing the placeholder the
 * four sections use until T-97c splits them.
 *
 * WHAT GOES ON IT IS SOMEBODY ELSE'S TICKET. A dashboard is a summary of things
 * that are not built yet - clinics, staff, a subscription's usage - and inventing
 * its contents here would mean guessing at four other tickets' answers and being
 * wrong about at least one of them.
 *
 * NOTE THAT `/` LANDS HERE, NOT ON `/practice`. That is a deliberate departure
 * from T-97 §4 and criterion 1, which were written before this console had a
 * dashboard; the ticket's route table is the record of what was asked for, and
 * this is the record of what was decided after seeing it running.
 */
@Component({
  selector: 'app-dashboard-section',
  imports: [Placeholder, TranslatePipe],
  templateUrl: './dashboard-section.html',
})
export class DashboardSection {}

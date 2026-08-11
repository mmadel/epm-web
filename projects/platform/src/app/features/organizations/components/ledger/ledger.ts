import { Component, inject } from '@angular/core';

import { OrganizationDraft } from '../../organization-draft';

/**
 * What will exist when the call returns, beside the thing being filled in.
 *
 * IT IS WHY THE SCREEN IS TWO COLUMNS. A form column on its own leaves half a
 * desktop empty, and the half was worth an answer to "what am I actually making"
 * that does not cost a scroll to the last step. It is sticky, because that
 * question does not stop being asked when the form scrolls.
 *
 * IT OWNS NOTHING. Every value here is read from the same draft the steps write
 * to, so there is no second copy of the organization to fall out of step with the
 * first - which is the failure mode of a summary panel that is handed its data.
 */
@Component({
  selector: 'app-ledger',
  templateUrl: './ledger.html',
  styleUrl: './ledger.scss',
})
export class Ledger {
  protected readonly draft = inject(OrganizationDraft);
}

import { Component, inject } from '@angular/core';
import { ListedPlan } from 'api-client';

import { Plans } from '../../data/plans';
import { OrganizationDraft } from '../../organization-draft';

/**
 * The plan, chosen from a card per plan.
 *
 * IT WAS A SELECT, AND THE REASON IT WAS IS STILL BINDING. Cards were taken out
 * once because they carried a sentence per plan that nobody had written - invented
 * marketing copy for plans the API describes with a name and two numbers. THERE IS
 * STILL NO SENTENCE HERE. A card carries the plan's name and the two limits the
 * response actually sends, and nothing else; if `listPlans` ever answers with a
 * description, that is when a card gets one.
 *
 * What the cards buy over the select is that the numbers are visible while the
 * choice is being made. A select shows one plan at a time and said what it came
 * with only after it had been chosen, so comparing two plans meant choosing one,
 * reading a line under the control, and choosing the other to read it again.
 *
 * THE LIST IS NOT IN THIS REPOSITORY (T-64 §4, T-86). A plan added to the server's
 * table appears here on the next page load with no frontend change - which is why
 * there is no list of plans to read in this file or in its template.
 *
 * It is a component of its own rather than a block in the page for two reasons: it
 * is the one part of the form with a loading state, a failure state and a retry of
 * its own, and the page's stylesheet is already the largest in the console.
 *
 * It reads the same draft the rest of the form writes to and owns none of it - the
 * same arrangement the ledger uses, and for the same reason: a second copy of the
 * chosen plan is a second answer to fall out of step with the first.
 */
@Component({
  selector: 'app-plan-choice',
  templateUrl: './plan-choice.html',
  styleUrl: './plan-choice.scss',
})
export class PlanChoice {
  protected readonly plans = inject(Plans);
  protected readonly draft = inject(OrganizationDraft);

  /**
   * What a plan comes with, as the one line under its name.
   *
   * Every member of the generated type is optional, so a limit the response did not
   * send is a shape the compiler insists is possible. A missing one is DROPPED
   * rather than rendered as a blank or a zero: "0 seats" is a plan nobody could use,
   * and it would be this console inventing a number the server never sent.
   */
  protected allowanceOf(plan: ListedPlan): string {
    return [count(plan.seatLimit, 'seat', 'seats'), count(plan.branchLimit, 'branch', 'branches')]
      .filter((part) => part !== '')
      .join(' · ');
  }

  protected onPlan(event: Event): void {
    this.draft.setPlan((event.target as HTMLInputElement).value);
  }
}

function count(limit: number | undefined, one: string, many: string): string {
  return limit === undefined ? '' : `${limit} ${limit === 1 ? one : many}`;
}

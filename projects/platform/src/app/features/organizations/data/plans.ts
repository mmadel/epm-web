import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ListedPlan, PlatformReferenceDataService } from 'api-client';

/**
 * The plans a practice can be put on, as the API lists them.
 *
 * THE LIST IS NOT IN THIS REPOSITORY, and that is the whole point of the ticket
 * (T-64 §4, T-86). A plan added to the server's table appears in the select on the
 * next page load, with no frontend change and no release. Whatever replaced this
 * with a constant would work perfectly until the day somebody added a plan, and
 * then be wrong silently - the form would keep offering three plans and the fourth
 * would be unreachable, with nothing on screen to say so.
 *
 * `seatLimit` and `branchLimit` come from the same response, so the counters on
 * screen and the limits the server enforces have one source. They still do not
 * *block* anything - see the counters on the page, and `EPM-ORG-006`.
 */
@Injectable({ providedIn: 'root' })
export class Plans {
  private readonly referenceData = inject(PlatformReferenceDataService);

  // Called once, when something first injects this service - which is the screen
  // opening. `reload()` is the retry the failure state offers, and it is the only
  // other thing that ever calls the route.
  private readonly listed = rxResource({
    stream: () => this.referenceData.listPlans(),
    defaultValue: [],
  });

  /**
   * The plans, in the order the server sent them (`listPlans` orders by `seatLimit`).
   *
   * A plan with no name is dropped rather than rendered. The generated type makes
   * every member optional, so this is a shape the compiler insists is possible; an
   * option whose value is `undefined` would render as a blank row that sets the plan
   * to nothing, which is a worse answer than not offering it.
   */
  readonly all = computed(() =>
    // `hasValue()` before `value()`, because a resource in an error state THROWS
    // from `value()` - a default value does not stand in for one. Reading it
    // unguarded put the failure inside change detection, where it takes the whole
    // screen down: the one state in which the reader most needs the retry below is
    // the state that would render nothing at all.
    (this.listed.hasValue() ? this.listed.value() : []).filter((plan) => (plan.plan ?? '') !== ''),
  );

  /** True while the first call, or a retry, is in flight. The select is disabled. */
  readonly areLoading = this.listed.isLoading;

  /**
   * True when the call failed.
   *
   * The form is unusable in this state - no plan can be chosen, so nothing can be
   * created - and the screen says so and offers {@link retry}. What it must not do is
   * fall back to a list of its own: a select that quietly offers plans nobody
   * published is how a practice ends up on a plan that does not exist.
   */
  readonly haveFailed = computed(() => this.listed.error() !== undefined);

  /** The limits for one plan, by name. `undefined` until the plans have arrived. */
  limitsOf(name: string): ListedPlan | undefined {
    return this.all().find((plan) => plan.plan === name);
  }

  retry(): void {
    this.listed.reload();
  }
}

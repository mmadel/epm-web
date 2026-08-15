import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PlatformClinicStatusEnum,
  PlatformOrganizationStatusEnum,
  PlatformSubscriptionStatusEnum,
} from 'api-client';

import { editPath, ROUTE_PATHS } from '../../../../route-paths';
import { Practice } from '../../data/practice';

/** How a practice's own status is worded and toned. See the list, which agrees. */
const STATUSES: Readonly<Record<string, { readonly label: string; readonly tone: string }>> = {
  [PlatformOrganizationStatusEnum.Active]: { label: 'Active', tone: 'active' },
  [PlatformOrganizationStatusEnum.Suspended]: { label: 'Suspended', tone: 'warning' },
  [PlatformOrganizationStatusEnum.Closed]: { label: 'Closed', tone: 'quiet' },
};

/**
 * How a SUBSCRIPTION's status is worded. It is a different set from the practice's
 * own, and that is the point of showing both.
 *
 * `LLD-ORGANIZATION.md` §1 calls subscription status billing state, deliberately
 * not read on the request path - so a practice can be ACTIVE with a PAST_DUE
 * subscription, and somebody looking at only one of the two would draw the wrong
 * conclusion about why a customer is complaining.
 */
const SUBSCRIPTIONS: Readonly<Record<string, { readonly label: string; readonly tone: string }>> = {
  [PlatformSubscriptionStatusEnum.Trial]: { label: 'Trial', tone: 'warning' },
  [PlatformSubscriptionStatusEnum.Active]: { label: 'Active', tone: 'active' },
  // PAST_DUE is the one billing state somebody has to act on, and the only one that
  // takes the danger tone: the others are where a practice is in its life, this is
  // money that did not arrive.
  [PlatformSubscriptionStatusEnum.PastDue]: { label: 'Past due', tone: 'danger' },
  [PlatformSubscriptionStatusEnum.Suspended]: { label: 'Suspended', tone: 'warning' },
  [PlatformSubscriptionStatusEnum.Cancelled]: { label: 'Cancelled', tone: 'quiet' },
};

const ON = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** `5 months ago`, `in 12 days`. The reading a date on its own makes you work out. */
const SINCE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

const DAY = 24 * 60 * 60 * 1000;

/** One thing about this practice that somebody may have to act on. */
interface Note {
  readonly tone: 'danger' | 'warning';
  readonly text: string;
}

/** One of the two usage figures, and how far along its limit it is. */
interface Meter {
  readonly label: string;
  readonly used: number;
  readonly limit: number;
  /** `6 of 20`, which is the reading. The bar repeats it. */
  readonly reading: string;
  /** How much of the bar is filled, capped at 100 so an over-limit bar is full. */
  readonly filled: number;
  readonly isOver: boolean;
  /** `14 seats`, the headroom - which is the number somebody is actually deciding on. */
  readonly spare: string;
}

/** One branch, as the list of them draws it. */
interface BranchRow {
  readonly id: string;
  readonly name: string;
  readonly isUnnamed: boolean;
  readonly isActive: boolean;
}

/**
 * One practice: what it is, how big it is, and the branches it operates from.
 *
 * IT IS THE SCREEN THE LIST'S DISCLOSURE CHEVRON WAS DESIGNED TO OPEN, and until
 * this existed there was nothing behind it - which is why the list shipped without
 * one. Design §5 also asks the list's row for a seat meter; that figure is not in
 * `ListedOrganization` at all, and it is here, because `getOrganizationById` is the
 * route that carries a subscription (`LLD-ORGANIZATION.md` §2.8).
 *
 * STILL COUNTS, NEVER CONTENTS. This is the most detailed screen a platform
 * administrator has and it is still the same boundary: §2.8 says no staff member
 * appears in any form - no name, no email address, no phone number, nothing
 * clinical - and the screen shows the response and never asks anything else for
 * more. The footnote says so in words, as it does on the list.
 *
 * IT DOES NOT USE `app-page-header`, which is the one convention this screen
 * breaks and the reason is worth writing down. That component takes the `h1` from
 * the route's title so that the tab and the heading cannot disagree. A route cannot
 * know a practice's name before the call that fetches it, so the heading here is
 * data: the route's title is the constant "Practice", which is what the tab reads,
 * and the `h1` is the practice. It carries `tabindex="-1"` itself, because the
 * frame moves focus to `main h1` after every navigation and would otherwise find
 * an element the browser refuses to focus.
 *
 * THERE IS NO EDIT CONTROL, and that is not an omission. The whole platform API is
 * four operations - list practices, read one, onboard one, list plans. There is no
 * route that changes a practice: not its name, not its plan, not its status, not a
 * branch. A control offering it would be a button with nothing behind it, which is
 * worse than its absence because the absence is at least honest about the product.
 */
@Component({
  selector: 'app-practice-page',
  imports: [RouterLink],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.scss',
})
export class PracticePage {
  private readonly route = inject(ActivatedRoute);

  protected readonly practice = inject(Practice);

  protected readonly listLink = ROUTE_PATHS.practices;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  /**
   * The practice's id, from the address.
   *
   * IT IS ALSO ON SCREEN, and mono. Five internal users will screenshot this into a
   * support thread, and the id is the fastest route to the log line - the same
   * argument design §4 makes for showing an error code in this console and nowhere
   * else in the product. It is not patient data and it is not a person.
   */
  protected readonly id = computed(() => this.params().get('id') ?? '');

  protected readonly editLink = computed(() => editPath(this.id()));

  /**
   * Whether the id has just been copied.
   *
   * A CONTROL THAT DOES SOMETHING INVISIBLE HAS TO SAY SO. Copying puts nothing on
   * screen, so without this the reader presses it twice and pastes it once.
   */
  protected readonly hasCopied = signal(false);

  private copiedAt: ReturnType<typeof setTimeout> | undefined;

  /**
   * Puts the practice id on the clipboard.
   *
   * IT IS THE REASON THE ID IS ON SCREEN. Five internal users will paste it into a
   * support thread or a log query, and reading sixteen characters off a screen by
   * eye is where the typo comes from. It changes nothing about the practice - see
   * the class note on why there is no control here that does.
   */
  protected async copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.id());
      this.hasCopied.set(true);

      clearTimeout(this.copiedAt);
      this.copiedAt = setTimeout(() => this.hasCopied.set(false), 2000);
    } catch {
      // A browser that refuses the clipboard - no permission, no secure context -
      // leaves the id on screen to be selected by hand, which is where it was
      // before this control existed. There is nothing worth saying about that.
    }
  }

  constructor() {
    // The address says which practice, and it is the only thing that does - the
    // same one-way arrangement the list uses for its search and its page.
    effect(() => this.practice.show(this.id()));
  }

  // ---------------------------------------------------------------------------
  // What it is
  // ---------------------------------------------------------------------------

  /** The name, or a placeholder. Never blank: the `h1` is what focus lands on. */
  protected readonly name = computed(() => {
    const name = (this.practice.practice()?.name ?? '').trim();

    return name === '' ? 'Unnamed practice' : name;
  });

  protected readonly status = computed(() => {
    const status = this.practice.practice()?.status;

    return STATUSES[status ?? ''] ?? { label: status ?? '—', tone: 'quiet' };
  });

  protected readonly subscriptionStatus = computed(() => {
    const status = this.practice.practice()?.subscription?.status;

    return status === undefined
      ? undefined
      : (SUBSCRIPTIONS[status] ?? { label: status, tone: 'unknown' });
  });

  protected readonly plan = computed(() => this.practice.practice()?.subscription?.plan ?? '—');

  protected readonly onboarded = computed(() => on(this.practice.practice()?.createdAt));

  /**
   * How long ago that was, beside the date rather than instead of it.
   *
   * "1 Mar 2026" is the fact and "5 months ago" is the reading; a support thread
   * wants the first and the person deciding whether this is a new customer wants
   * the second, and neither should have to do the subtraction.
   */
  protected readonly onboardedAgo = computed(() => ago(this.practice.practice()?.createdAt));

  /** When the trial runs out, whatever state the subscription is in. */
  protected readonly trialEndsOn = computed(() =>
    on(this.practice.practice()?.subscription?.trialEndsAt),
  );

  protected readonly trialEndsAgo = computed(() =>
    ago(this.practice.practice()?.subscription?.trialEndsAt),
  );

  // ---------------------------------------------------------------------------
  // What somebody may have to act on
  // ---------------------------------------------------------------------------

  /**
   * The facts about this practice that are worth interrupting somebody with.
   *
   * WHY THIS EXISTS. Every one of these was already on the screen - the billing
   * pill, the practice's status, a meter over its limit - and every one of them was
   * a twelve-pixel word in a panel. A platform administrator opens this record
   * BECAUSE something is wrong with it, and the thing that is wrong should not be
   * the smallest thing on the page.
   *
   * NOTHING HERE IS INVENTED. Each note is a restatement of a field the response
   * carried, in the words somebody would use about it; the screen still shows every
   * one of those fields in its own place, and this is the summary rather than the
   * source.
   */
  protected readonly notes = computed<readonly Note[]>(() => {
    const practice = this.practice.practice();

    if (practice === undefined) {
      return [];
    }

    const notes: Note[] = [];
    const subscription = practice.subscription;

    if (subscription?.status === PlatformSubscriptionStatusEnum.PastDue) {
      notes.push({ tone: 'danger', text: 'Billing is past due on this subscription.' });
    }

    if (subscription?.status === PlatformSubscriptionStatusEnum.Cancelled) {
      notes.push({ tone: 'warning', text: 'This subscription has been cancelled.' });
    }

    if (practice.status === PlatformOrganizationStatusEnum.Suspended) {
      notes.push({ tone: 'warning', text: 'This practice is suspended.' });
    }

    // A TRIAL IS ONLY NEWS NEAR ITS END, and past it, it is news of a different
    // kind. A practice with two months of trial left is not something to interrupt
    // anybody about.
    const days = daysUntil(subscription?.trialEndsAt);

    if (subscription?.status === PlatformSubscriptionStatusEnum.Trial && days !== undefined) {
      if (days < 0) {
        notes.push({ tone: 'danger', text: `The trial ended ${ago(subscription.trialEndsAt)}.` });
      } else if (days <= 14) {
        notes.push({
          tone: 'warning',
          text: `The trial ends ${ago(subscription.trialEndsAt)}, on ${on(subscription.trialEndsAt)}.`,
        });
      }
    }

    for (const meter of this.meters()) {
      if (meter.isOver) {
        notes.push({
          tone: 'warning',
          text: `${meter.label} are over what this plan allows: ${meter.reading}.`,
        });
      }
    }

    return notes;
  });

  /** When the trial runs out, for a subscription that is on one. Absent otherwise. */
  protected readonly trialEnds = computed(() => {
    const subscription = this.practice.practice()?.subscription;

    return subscription?.status === PlatformSubscriptionStatusEnum.Trial
      ? on(subscription.trialEndsAt)
      : '';
  });

  // ---------------------------------------------------------------------------
  // How big it is
  // ---------------------------------------------------------------------------

  /**
   * The two usage figures, as meters.
   *
   * A meter needs both halves to mean anything: a limit with no usage, or usage
   * with no limit, is a bar with no scale. Either one missing drops the meter
   * rather than assuming a zero, because a bar drawn at 0 of 20 for a figure that
   * did not arrive says the practice is empty.
   */
  protected readonly meters = computed<readonly Meter[]>(() => {
    const subscription = this.practice.practice()?.subscription;

    return [
      meter('Seats', 'seat', 'seats', subscription?.seatsUsed, subscription?.seatLimit),
      meter(
        'Branches',
        'branch',
        'branches',
        subscription?.branchesUsed,
        subscription?.branchLimit,
      ),
    ].filter((entry): entry is Meter => entry !== undefined);
  });

  // ---------------------------------------------------------------------------
  // Where it operates from
  // ---------------------------------------------------------------------------

  protected readonly branches = computed<readonly BranchRow[]>(() =>
    (this.practice.practice()?.clinics ?? []).map((clinic, at) => {
      const name = (clinic.name ?? '').trim();

      return {
        id: clinic.id ?? `branch-${at}`,
        name: name === '' ? 'Unnamed branch' : name,
        isUnnamed: name === '',
        isActive: clinic.status === PlatformClinicStatusEnum.Active,
      };
    }),
  );

  protected readonly inactiveBranches = computed(
    () => this.branches().filter((branch) => !branch.isActive).length,
  );

  protected readonly activeBranches = computed(
    () => this.branches().filter((branch) => branch.isActive).length,
  );
}

/** `5 months ago`, or nothing for a date that is absent or unreadable. */
function ago(value: string | undefined): string {
  const at = value === undefined ? Number.NaN : Date.parse(value);

  if (Number.isNaN(at)) {
    return '';
  }

  // READ FROM THE CLOCK ON PURPOSE, unlike the list's date criteria: this is a
  // sentence about how long ago something happened, and one that did not move with
  // the clock would be wrong by exactly as long as the tab was left open.
  const days = Math.round((at - Date.now()) / DAY);

  if (Math.abs(days) < 31) {
    return SINCE.format(days, 'day');
  }

  const months = Math.round(days / 30);

  return Math.abs(months) < 12
    ? SINCE.format(months, 'month')
    : SINCE.format(Math.round(months / 12), 'year');
}

/** How many days until a moment, negative once it has passed. */
function daysUntil(value: string | undefined): number | undefined {
  const at = value === undefined ? Number.NaN : Date.parse(value);

  return Number.isNaN(at) ? undefined : Math.round((at - Date.now()) / DAY);
}

function on(value: string | undefined): string {
  if (value === undefined) {
    return '';
  }

  const at = new Date(value);

  return Number.isNaN(at.getTime()) ? '' : ON.format(at);
}

function meter(
  label: string,
  singular: string,
  plural: string,
  used: number | undefined,
  limit: number | undefined,
): Meter | undefined {
  if (used === undefined || limit === undefined) {
    return undefined;
  }

  const spare = Math.max(0, limit - used);

  return {
    label,
    used,
    limit,
    // The headroom rather than the usage again. "6 of 20" is what is used; "14 seats
    // left" is the number somebody deciding whether to move a practice up a plan is
    // actually reading, and doing that subtraction in your head is the whole job
    // this screen exists to save.
    spare: `${spare} ${spare === 1 ? singular : plural}`,
    reading: `${used} of ${limit}`,
    // A limit of zero would divide by nothing. It is a plan that entitles the
    // practice to none of something, so anything used at all is over it.
    filled: limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100)),
    isOver: used > limit,
  };
}

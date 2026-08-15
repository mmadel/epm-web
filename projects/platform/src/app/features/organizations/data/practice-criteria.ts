import { ParamMap, Params } from '@angular/router';
import { ListedOrganization, ListedOrganizationStatusEnum } from 'api-client';

/**
 * What a platform administrator is currently asking the practice list for.
 *
 * ONE ROUTE ANSWERS ONE OF THESE CRITERIA, AND THE CONSOLE ANSWERS THE REST.
 * `listOrganizations` takes `name`, `page` and `size` and nothing else
 * (`LLD-ORGANIZATION.md` §2.8) - no status, no plan, no size, no ordering. That is a
 * gap in the contract, raised for the backend, and it is the whole reason this file
 * exists: a screen that offered only what the route offers would let an
 * administrator find a practice by name and answer nothing else they came to ask.
 *
 * WHAT MAKES THAT HONEST IS THAT NOTHING IS FILTERED PER PAGE. Design §6.1 was
 * right to reject filtering the twenty-five rows on screen: "3 suspended" computed
 * over one page is a statement about the page dressed up as one about the platform.
 * So when any of these criteria is engaged, `Practices` reads the WHOLE result set
 * for the name first - see `Practices.everything` - and everything here is applied
 * to that. The counts beside each option are then facts about the platform, which
 * is the only kind of count worth putting on this screen.
 *
 * EVERY CRITERION IS IN THE ADDRESS (§6, "the URL is the state"). A refined list is
 * a link somebody can paste into a support thread, and the back button takes each
 * refinement off in the order it went on.
 */
export interface Criteria {
  /** The name fragment. The one criterion the server itself matches. */
  readonly name: string;

  /** Statuses to keep. Empty means every status. */
  readonly statuses: readonly string[];

  /** Plans to keep, by the exact word the server sent. Empty means every plan. */
  readonly plans: readonly string[];

  /** The fewest branches a practice may have to be kept. `0` is any. */
  readonly branches: number;

  readonly staff: number;

  /**
   * The onboarding window, as two dates rather than a named period.
   *
   * `YYYY-MM-DD`, or `''` for an open end. A NAMED WINDOW - "last 90 days" - cannot
   * say "the second quarter", and a support thread or an invoice query is always
   * about a period somebody else has already named. Both ends are INCLUSIVE, which
   * is what a reader typing the same date into both means by it.
   */
  readonly from: string;

  readonly to: string;

  /** What the rows are ordered by. `''` is the order the server sent them in. */
  readonly order: Order;

  readonly direction: Direction;
}

export type Order = '' | 'name' | 'branches' | 'staff' | 'onboarded';

export type Direction = 'asc' | 'desc';

/**
 * Nothing asked for: every practice, in the order the server sent them.
 *
 * THE DEFAULT ORDER IS THE SERVER'S AND NOT `name`. The list route sorts, this
 * screen does not know how, and re-sorting a first page by name would silently
 * disagree with page two - which is still the server's order. "As listed" is a
 * real answer and it is the honest default.
 */
export const ANY: Criteria = {
  name: '',
  statuses: [],
  plans: [],
  branches: 0,
  staff: 0,
  from: '',
  to: '',
  order: '',
  direction: 'asc',
};

/** The status vocabulary, in the order the panel offers it. */
export const STATUSES: readonly { readonly value: string; readonly label: string }[] = [
  { value: ListedOrganizationStatusEnum.Active, label: 'Active' },
  { value: ListedOrganizationStatusEnum.Suspended, label: 'Suspended' },
  { value: ListedOrganizationStatusEnum.Closed, label: 'Closed' },
];

/**
 * The size thresholds a set of practices is worth offering, as "this many or more".
 *
 * THRESHOLDS RATHER THAN A NUMBER FIELD. "Between 4 and 11 branches" is not a
 * question anybody has; "the big ones" is, and it is asked by pressing one control
 * rather than by typing a figure into two.
 *
 * OUT OF THE DATA RATHER THAN OUT OF THE AIR. These were `2+ / 5+ / 10+` written
 * here, which is a guess about a platform this file has never seen: on one made of
 * single-site practices, `10+` is a chip that can never do anything, and on one made
 * of hospital groups, `2+` is a chip that never removes a row. Reading the median,
 * the upper quartile and the top tenth off the practices themselves means the three
 * steps always cut the list somewhere, whatever the platform is made of.
 *
 * A step below two is dropped, because "one or more" is every practice with a count.
 * If nothing survives that, the group is not offered at all - see `facetsOf`.
 */
export function stepsFrom(counts: readonly (number | undefined)[]): readonly number[] {
  const values = counts
    .filter((count): count is number => typeof count === 'number' && count > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return [];
  }

  const at = (fraction: number): number =>
    values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;

  return [...new Set([at(0.5), at(0.75), at(0.9)])]
    .filter((step) => step >= 2)
    .sort((a, b) => a - b);
}

export const ORDER_OPTIONS: readonly { readonly value: Order; readonly label: string }[] = [
  { value: '', label: 'As listed' },
  { value: 'name', label: 'Name' },
  { value: 'branches', label: 'Branches' },
  { value: 'staff', label: 'Staff' },
  { value: 'onboarded', label: 'Onboarded' },
];

const DAY = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD`, and a date that exists. Anything else is no bound at all. */
function day(value: string | null): string {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }

  return Number.isNaN(Date.parse(value)) ? '' : value;
}

/** The first moment of a day, and the last. Both ends of the range are inclusive. */
function opens(date: string): number {
  return Date.parse(date);
}

function closes(date: string): number {
  return Date.parse(date) + DAY - 1;
}

/** `YYYY-MM-DD` for a moment, which is what a date input reads and writes. */
export function asDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** The first day of the month a moment falls in. What `New this month` means. */
export function startOfMonth(at: number): string {
  return `${asDay(at).slice(0, 7)}-01`;
}

/**
 * Reads the criteria out of the address.
 *
 * ANYTHING UNRECOGNISED IS DROPPED RATHER THAN PASSED ON. A hand-typed
 * `?order=salary` or `?branches=-4` is a link somebody edited or a bookmark from a
 * build that offered something this one does not, and the answer to both is the
 * unrefined list rather than a request nothing on screen explains.
 */
export function readCriteria(params: ParamMap): Criteria {
  return {
    name: params.get('name') ?? '',
    statuses: list(params.get('status')),
    plans: list(params.get('plan')),
    branches: step(params.get('branches')),
    staff: step(params.get('staff')),
    from: day(params.get('from')),
    to: day(params.get('to')),
    order: ORDER_OPTIONS.some((option) => option.value !== '' && option.value === params.get('by'))
      ? (params.get('by') as Order)
      : '',
    direction: params.get('dir') === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * The criteria as query parameters, with `null` for everything left at its default.
 *
 * `null` REMOVES A PARAMETER rather than writing an empty one, so an unrefined list
 * is `/practices` and not `/practices?name=&status=&plan=`. The address somebody
 * shares should say what they were looking at and nothing else.
 */
export function criteriaQuery(criteria: Criteria): Params {
  return {
    name: criteria.name.trim() === '' ? null : criteria.name.trim(),
    status: criteria.statuses.length === 0 ? null : [...criteria.statuses].join(','),
    plan: criteria.plans.length === 0 ? null : [...criteria.plans].join(','),
    branches: criteria.branches === 0 ? null : criteria.branches,
    staff: criteria.staff === 0 ? null : criteria.staff,
    from: criteria.from === '' ? null : criteria.from,
    to: criteria.to === '' ? null : criteria.to,
    by: criteria.order === '' ? null : criteria.order,
    // Only meaningful beside an ordering, so it is never in the address without one.
    dir: criteria.order === '' || criteria.direction === 'asc' ? null : 'desc',
  };
}

/**
 * Whether anything beyond the name is being asked for.
 *
 * THIS IS THE SWITCH BETWEEN TWO WAYS OF READING THE LIST. False, and the server
 * pages as it always has. True, and `Practices` reads every page for the name so
 * that what gets filtered and counted is the platform rather than a page of it.
 * Ordering counts as refinement for the same reason: sorting one page by staff
 * puts the biggest practice ON THAT PAGE at the top and calls it the biggest.
 */
export function isRefined(criteria: Criteria): boolean {
  return (
    criteria.statuses.length > 0 ||
    criteria.plans.length > 0 ||
    criteria.branches > 0 ||
    criteria.staff > 0 ||
    criteria.from !== '' ||
    criteria.to !== '' ||
    criteria.order !== ''
  );
}

/**
 * Whether a practice is one of the answers.
 *
 * IT DOES NOT READ THE CLOCK, and no longer needs one passed in: the onboarding
 * criterion is two absolute dates now rather than "the last thirty days", so what
 * this keeps does not change while a page sits open. `now` still reaches
 * {@link facetsOf}, because `New this month` has to know which month that is.
 */
export function matches(practice: ListedOrganization, criteria: Criteria): boolean {
  if (criteria.statuses.length > 0 && !criteria.statuses.includes(practice.status ?? '')) {
    return false;
  }

  if (criteria.plans.length > 0 && !criteria.plans.includes(practice.plan ?? '')) {
    return false;
  }

  // A COUNT THAT DID NOT ARRIVE IS NOT A ZERO. `undefined` means the response
  // carried no figure, and dropping such a practice from "2 branches or more" would
  // be answering with a fact nobody sent - so it fails the threshold only once a
  // threshold is actually being asked for, which is the least wrong of the two.
  if (criteria.branches > 0 && (practice.clinicCount ?? 0) < criteria.branches) {
    return false;
  }

  if (criteria.staff > 0 && (practice.staffCount ?? 0) < criteria.staff) {
    return false;
  }

  if (criteria.from !== '' || criteria.to !== '') {
    const at = Date.parse(practice.createdAt ?? '');

    // A DATE THAT DID NOT ARRIVE IS NOT A DATE IN THE RANGE. The alternative -
    // keeping it - puts a practice inside "onboarded in March" on the strength of
    // the console not knowing when it was onboarded.
    if (Number.isNaN(at)) {
      return false;
    }

    if (criteria.from !== '' && at < opens(criteria.from)) {
      return false;
    }

    if (criteria.to !== '' && at > closes(criteria.to)) {
      return false;
    }
  }

  return true;
}

/**
 * The rows in the order asked for.
 *
 * A COPY, because the array being ordered is the one the resource is holding and
 * `sort` works in place. Ordering by name is `localeCompare` rather than `<`, so
 * "Ávila" lands beside "Avila" rather than after "Zaki".
 */
export function ordered(
  rows: readonly ListedOrganization[],
  criteria: Criteria,
): readonly ListedOrganization[] {
  if (criteria.order === '') {
    return rows;
  }

  const way = criteria.direction === 'desc' ? -1 : 1;

  return [...rows].sort((a, b) => way * rank(a, b, criteria.order));
}

function rank(a: ListedOrganization, b: ListedOrganization, order: Order): number {
  switch (order) {
    case 'name':
      return (a.name ?? '').localeCompare(b.name ?? '', 'en');
    case 'branches':
      return (a.clinicCount ?? 0) - (b.clinicCount ?? 0);
    case 'staff':
      return (a.staffCount ?? 0) - (b.staffCount ?? 0);
    case 'onboarded':
      return (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0);
    default:
      return 0;
  }
}

/** A view as the panel draws it: an option that carries the filters it sets. */
export interface ViewFacet extends Facet {
  readonly criteria: Criteria;
}

/** One option in the panel: what it is, what it says, and how many it would keep. */
export interface Facet {
  readonly value: string;
  readonly label: string;
  readonly count: number;
  readonly isOn: boolean;
}

/** Every option the panel offers, counted against the practices actually there. */
export interface Facets {
  readonly statuses: readonly Facet[];
  readonly plans: readonly Facet[];
  readonly branches: readonly Facet[];
  readonly staff: readonly Facet[];
  /** The one-press views, counted the same way, each carrying what it stands for. */
  readonly views: readonly ViewFacet[];

  /**
   * What "Any" would leave, in each group that has one.
   *
   * The same rule as every other count on the panel - the group's own criterion
   * lifted, the rest still applied - so the option that takes a filter OFF says how
   * many practices come back with it, which is the question somebody about to press
   * it is actually asking.
   */
  readonly anyBranches: number;
  readonly anyStaff: number;
  readonly anyDate: number;
}

/**
 * What each option in the panel would leave on screen.
 *
 * EACH DIMENSION IS COUNTED WITH ITS OWN CRITERION LIFTED, which is what makes the
 * counts add up to something a reader can act on: with `Suspended` chosen, the
 * number beside `Active` has to be how many would be there if they pressed it, not
 * zero. Every OTHER criterion still applies, so "Basic 2" beside a chosen
 * `Suspended` means two suspended practices are on Basic.
 *
 * A count of zero is an option the panel disables rather than hides. The set of
 * statuses is fixed vocabulary and a reader who cannot see `Closed` cannot tell
 * whether it is missing because there are none or because this build forgot it.
 */
export function facetsOf(
  rows: readonly ListedOrganization[],
  criteria: Criteria,
  now: number,
): Facets {
  const held = (except: Partial<Criteria>): readonly ListedOrganization[] =>
    rows.filter((row) => matches(row, { ...criteria, ...except }));

  const byStatus = held({ statuses: [] });
  const byPlan = held({ plans: [] });
  const byBranches = held({ branches: 0 });
  const byStaff = held({ staff: 0 });
  const byDate = held({ from: '', to: '' });

  // The vocabulary this build knows, plus any status the server sent that it does
  // not - an unrecognised status is still somebody's practice, and leaving it out
  // of the panel would make it unfindable.
  const statuses = [
    ...STATUSES,
    ...[...new Set(rows.map((row) => row.status ?? ''))]
      .filter((value) => value !== '' && !STATUSES.some((known) => known.value === value))
      .map((value) => ({ value, label: value.toLowerCase() })),
  ];

  return {
    statuses: statuses.map(({ value, label }) => ({
      value,
      label,
      count: byStatus.filter((row) => (row.status ?? '') === value).length,
      isOn: criteria.statuses.includes(value),
    })),

    plans: [...new Set(rows.map((row) => row.plan ?? ''))]
      .filter((plan) => plan !== '')
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((plan) => ({
        value: plan,
        label: plan,
        count: byPlan.filter((row) => (row.plan ?? '') === plan).length,
        isOn: criteria.plans.includes(plan),
      })),

    branches: ladder(
      stepsFrom(rows.map((row) => row.clinicCount)),
      criteria.branches,
      byBranches,
      (row) => row.clinicCount,
    ),

    staff: ladder(
      stepsFrom(rows.map((row) => row.staffCount)),
      criteria.staff,
      byStaff,
      (row) => row.staffCount,
    ),

    views: viewsFor(rows, now).map((view) => ({
      value: view.key,
      label: view.label,
      criteria: view.criteria,
      count: rows.filter((row) => matches(row, view.criteria)).length,
      isOn: isViewOn(view, criteria),
    })),

    anyBranches: byBranches.length,
    anyStaff: byStaff.length,
    anyDate: byDate.length,
  };
}

/**
 * A size group: the steps the data suggests, plus whatever the address is asking for.
 *
 * A THRESHOLD FROM A LINK IS ALWAYS SHOWN even when it is not one of this platform's
 * steps - a filter applied to the list and missing from the panel is a filter nobody
 * can turn off, which is the worst thing a panel can do.
 */
function ladder(
  steps: readonly number[],
  asked: number,
  within: readonly ListedOrganization[],
  countOf: (row: ListedOrganization) => number | undefined,
): readonly Facet[] {
  const all =
    steps.includes(asked) || asked === 0 ? steps : [...steps, asked].sort((a, b) => a - b);

  return all.map((step) => ({
    value: `${step}`,
    label: `${step}+`,
    count: within.filter((row) => (countOf(row) ?? 0) >= step).length,
    isOn: asked === step,
  }));
}

/**
 * The questions a platform administrator opens this console already holding.
 *
 * ONE PRESS RATHER THAN THREE. "Which practices need looking at" is a question, not
 * a status plus a plan plus a window, and a panel that can only be driven one
 * criterion at a time makes the reader assemble the same combination every morning.
 * Each of these sets the filters outright rather than narrowing what is already
 * applied - a view is somewhere to jump to, and pressing the one you are on takes
 * you back out of it.
 *
 * THEY ARE NOT ALL ALWAYS OFFERED. `Trials` exists only where a plan called one
 * does, and `Large accounts` only where the practices differ enough in size for
 * there to be a large one - a view that is permanently everything, or permanently
 * nothing, teaches a reader to ignore the row it is in.
 */
export interface View {
  readonly key: string;
  readonly label: string;
  /** What it sets. The name and the ordering are the reader's and are left alone. */
  readonly criteria: Criteria;
}

export function viewsFor(rows: readonly ListedOrganization[], now: number): readonly View[] {
  const views: View[] = [
    {
      key: 'attention',
      label: 'Needs attention',
      criteria: { ...ANY, statuses: [ListedOrganizationStatusEnum.Suspended] },
    },
    { key: 'new', label: 'New this month', criteria: { ...ANY, from: startOfMonth(now) } },
  ];

  // The plan the server calls a trial, whatever it calls it. Not a constant here:
  // the plans are the platform's, and this console does not get to invent one.
  const trial = [...new Set(rows.map((row) => row.plan ?? ''))].find((plan) => /trial/i.test(plan));

  if (trial !== undefined) {
    views.push({ key: 'trial', label: 'On trial', criteria: { ...ANY, plans: [trial] } });
  }

  const staffSteps = stepsFrom(rows.map((row) => row.staffCount));
  const biggest = staffSteps.at(-1);

  if (biggest !== undefined) {
    views.push({ key: 'large', label: 'Large accounts', criteria: { ...ANY, staff: biggest } });
  }

  return views;
}

/** Whether the filters currently applied are exactly this view's. */
export function isViewOn(view: View, criteria: Criteria): boolean {
  const asked = view.criteria;

  return (
    criteria.branches === asked.branches &&
    criteria.staff === asked.staff &&
    criteria.from === asked.from &&
    criteria.to === asked.to &&
    criteria.statuses.length === asked.statuses.length &&
    criteria.statuses.every((status) => asked.statuses.includes(status)) &&
    criteria.plans.length === asked.plans.length &&
    criteria.plans.every((plan) => asked.plans.includes(plan))
  );
}

/**
 * The criteria a view asks for, keeping what is the reader's rather than the view's.
 *
 * The name they typed and the column they are sorted by survive it; pressing the
 * view you are already on clears the filters and leaves those two alone as well.
 */
export function applyView(view: View, criteria: Criteria, isOn: boolean): Criteria {
  return {
    ...(isOn ? ANY : view.criteria),
    name: criteria.name,
    order: criteria.order,
    direction: criteria.direction,
  };
}

/** One criterion as it appears in the row of removable tags under the field. */
export interface Applied {
  /** What removing it changes, which the screen turns back into an address. */
  readonly without: Criteria;
  readonly group: string;
  readonly value: string;
}

/**
 * Every criterion currently applied, worded for the tag that takes it off again.
 *
 * THE PANEL CAN BE SHUT AND THE FILTERS STILL APPLY, which is the failure mode this
 * row exists to prevent: a list showing three of forty practices for a reason
 * folded away behind a control is a screen that lies by omission. Each tag names
 * its group, so `Basic` is legible as a plan rather than as a word somebody typed.
 */
export function appliedTags(criteria: Criteria): readonly Applied[] {
  const tags: Applied[] = [];

  for (const status of criteria.statuses) {
    tags.push({
      group: 'Status',
      value: STATUSES.find((known) => known.value === status)?.label ?? status.toLowerCase(),
      without: {
        ...criteria,
        statuses: criteria.statuses.filter((kept) => kept !== status),
      },
    });
  }

  for (const plan of criteria.plans) {
    tags.push({
      group: 'Plan',
      value: plan,
      without: { ...criteria, plans: criteria.plans.filter((kept) => kept !== plan) },
    });
  }

  if (criteria.branches > 0) {
    tags.push({
      group: 'Branches',
      value: `${criteria.branches}+`,
      without: { ...criteria, branches: 0 },
    });
  }

  if (criteria.staff > 0) {
    tags.push({ group: 'Staff', value: `${criteria.staff}+`, without: { ...criteria, staff: 0 } });
  }

  if (criteria.from !== '' || criteria.to !== '') {
    tags.push({
      group: 'Onboarded',
      value: window(criteria),
      without: { ...criteria, from: '', to: '' },
    });
  }

  // THE ORDERING IS NOT A TAG. It is drawn on the column it orders, with an arrow
  // and a word, directly above the rows it arranged - so a tag for it here would be
  // the same fact said twice, and "Clear all" would silently rearrange a list nobody
  // asked it to touch. The third press on the column heading is what takes it off.

  return tags;
}

/**
 * A date range in words: `1-31 Mar 2026`, `from 1 Mar 2026`, `until 31 Mar 2026`.
 *
 * An open end is said as an open end rather than filled in with today's date or with
 * the platform's first day - both of which would be this console answering a
 * question about a bound the reader deliberately left off.
 */
export function window(criteria: Criteria): string {
  const from = criteria.from === '' ? '' : shown(criteria.from);
  const to = criteria.to === '' ? '' : shown(criteria.to);

  if (from !== '' && to !== '') {
    return `${from} – ${to}`;
  }

  return from === '' ? `until ${to}` : `from ${from}`;
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function shown(date: string): string {
  return DATE.format(new Date(date));
}

/** A comma-separated parameter, with the empties dropped and the order kept. */
function list(value: string | null): readonly string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * A threshold out of the address.
 *
 * ANY WHOLE NUMBER, not one of a fixed list. The steps the panel offers are computed
 * from the practices on the platform, so they differ between platforms and change as
 * one grows - and a link shared last month, or from a platform with different
 * practices on it, still means exactly what it says. Nonsense is still refused: a
 * negative, a fraction and a word all mean no threshold at all.
 */
function step(value: string | null): number {
  const asked = Number(value);

  return Number.isInteger(asked) && asked >= 1 ? asked : 0;
}

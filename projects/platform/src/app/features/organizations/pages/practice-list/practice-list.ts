import { Component, computed, effect, ElementRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListedOrganization, ListedOrganizationStatusEnum } from 'api-client';

import { SearchPanel } from '../../components/search-panel/search-panel';
import { PageHeader } from '../../../../layout/page-header';
import { practicePath, ROUTE_PATHS } from '../../../../route-paths';
import {
  ANY,
  Applied,
  appliedTags,
  Criteria,
  criteriaQuery,
  isRefined,
  Order,
  readCriteria,
} from '../../data/practice-criteria';
import { Practices } from '../../data/practices';

/** How a status is worded and toned. Anything unrecognised keeps the server's word. */
const STATUSES: Readonly<
  Record<string, { readonly label: string; readonly tone: string; readonly pill: string }>
> = {
  [ListedOrganizationStatusEnum.Active]: { label: 'Active', tone: 'active', pill: 'active' },
  [ListedOrganizationStatusEnum.Suspended]: {
    label: 'Suspended',
    tone: 'suspended',
    pill: 'warning',
  },
  [ListedOrganizationStatusEnum.Closed]: { label: 'Closed', tone: 'closed', pill: 'quiet' },
};

/**
 * `1 Mar 2026`. Western numerals, as everything in this product is - see
 * `docs/design-tokens.md`, "Numerals: decided, and closed".
 */
const ONBOARDED_ON = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * One column of the board: its name, what it orders by, and how each press reads.
 *
 * THE WORDING IS PER COLUMN, because "ascending" is a word about a sort rather than
 * about practices: a reader ordering by name wants A-Z, one ordering by staff wants
 * the biggest first, and one ordering by date wants the newest.
 */
interface Column {
  readonly label: string;
  readonly order: Order;
  /** What the first press does, said for a reader who cannot see the arrow. */
  readonly first: string;
  readonly second: string;
}

const COLUMNS: readonly Column[] = [
  { label: 'Practice', order: 'name', first: 'A to Z', second: 'Z to A' },
  { label: 'Branches', order: 'branches', first: 'most first', second: 'fewest first' },
  { label: 'Staff', order: 'staff', first: 'most first', second: 'fewest first' },
  { label: 'Onboarded', order: 'onboarded', first: 'newest first', second: 'oldest first' },
];

/**
 * A run of a practice's name, and whether the search is what found it.
 *
 * The name is drawn as a sequence of these rather than as one string, so the part
 * that matched can be marked. See {@link matched}.
 */
interface NamePart {
  readonly text: string;
  readonly isHit: boolean;
}

/** One practice, as its row draws it. */
interface PracticeRow {
  readonly id: string;
  readonly name: string;
  /** The name split around what the search matched, for drawing it. */
  readonly parts: readonly NamePart[];
  readonly isUnnamed: boolean;
  /** `Standard`, or `Basic · suspended` when the status is worth saying. */
  readonly badge: string;
  /** The status edge's tone: what the practice's state is. */
  readonly tone: string;
  /** The same state as one of the console's four pill tones. */
  readonly badgeTone: string;
  /** True for a practice nobody has to act on, which recedes rather than shouts. */
  readonly isQuiet: boolean;
  /** Where the row opens: the practice's own screen. */
  readonly link: string;
  readonly branches: number | undefined;
  readonly staff: number | undefined;
  readonly onboarded: string;
}

/**
 * The console's landing screen: every practice on the platform.
 *
 * ALIGNED ROWS WITH THE STATUS ON A LEADING EDGE. Design §5 chose two-line rows
 * over an aligned table and recorded the cost of that choice: the counts sit at a
 * different horizontal position in every row, so "which of these is the big one"
 * means reading each row rather than looking down a column. This is the shape that
 * pays that cost off and keeps what the review was buying - the edge, the pill, and
 * a row that reads as a practice rather than as a spreadsheet line.
 *
 * THE SECOND LINE WENT WITH THE COLUMNS, and that is the reason. It read
 * "2 branches · 6 staff · onboarded 1 Mar 2026" beside columns saying 2, 6 and
 * 1 Mar 2026 - the same sentence twice, costing a line of every row on the screen.
 *
 * WHAT IT SAYS ABOUT A PRACTICE IS ITS SIZE, NEVER ITS CONTENTS. A name, a plan, a
 * status, how many branches and how many staff, and when it was onboarded - and
 * deliberately not one thing more. No patient count, no named staff member, nothing
 * clinical (F1 §3, P-04). The footnote on the screen says so in words, because §5
 * asks for it and because a new administrator has not read `PRODUCT.md`.
 *
 * THE URL IS THE STATE (§6). The search and the pager change the address and
 * nothing else; the address drives the one call. A search is therefore shareable
 * into a support thread and the back button undoes it, neither of which is true of
 * a screen that keeps its filter in a field.
 *
 * THE SEARCH ANSWERS IN THREE PLACES, WHICH IS ONE MECHANISM SEEN THREE TIMES. The
 * count sits inside the field, which is where §6 puts it and where the reader's eye
 * already is; a line under the field's edge says a call is in flight, because a
 * search that navigates to no new screen otherwise looks like a screen doing
 * nothing; and the matched run of each name is marked in the row, so a page of
 * twenty-five answers to `care` shows WHY each one is an answer without the reader
 * comparing the row against what they typed.
 *
 * IT ALSO OFFERS THE SEARCHES ALREADY RUN, under an empty field and only there. A
 * platform administrator working a support thread searches, opens a practice,
 * returns, and searches again for something adjacent - see `Practices.recent`, which
 * is where the list lives so that it survives that round trip.
 *
 * THE BARS ARE A COMPARISON, NOT A CAPACITY. Design §5 asks the row for a seat
 * meter; `ListedOrganization` carries no seat figure of any kind - no limit, no
 * usage - so a meter here would be measuring a number the server never sent. The
 * real one is on the practice screen, where `getOrganizationById` answers with a
 * subscription. What a bar CAN say honestly is how a practice compares with the
 * others on the page, which is the question the counts alone make hard.
 *
 * §6.1'S FILTERS ARE HERE NOW, AND NOT AS PILLS PARSED OUT OF THE SEARCH BOX. The
 * design has the field parse `trial`, `basic`, `read-only` into removable pills; a
 * box that silently turns some words into filters and leaves the rest as a name is
 * a box nobody can predict, and two of those three words are not in the status enum
 * at all. What shipped instead is a REFINE PANEL - status, plan, size, when it was
 * onboarded, and the ordering - with every option carrying the number of practices
 * it would leave, and a row of removable tags that keeps saying what is applied
 * after the panel is shut. See `RefinePanel`.
 *
 * WHAT MAKES THAT HONEST IS THAT THE FILTERING IS NOT DONE HERE. §6.1's objection
 * was right - filtering twenty-five held rows answers about the page - so the
 * service reads every page for the name before any of this applies (`Practices`,
 * and `Ask.whole`). The pager below then pages what MATCHED rather than what the
 * server happened to put on page one.
 *
 * THE VOCABULARY IS THE PRODUCT'S. The API counts clinics; this says branches. The
 * control reads "Add a practice", which is §4's word for it, not the schema's.
 */
@Component({
  selector: 'app-practice-list',
  imports: [PageHeader, RouterLink, SearchPanel],
  templateUrl: './practice-list.html',
  styleUrl: './practice-list.scss',
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class PracticeList {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly practices = inject(Practices);

  protected readonly onboardLink = ROUTE_PATHS.onboard;

  // ---------------------------------------------------------------------------
  // The address, which is the state
  // ---------------------------------------------------------------------------

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  /**
   * Everything being asked for, read off the address.
   *
   * ONE OBJECT RATHER THAN A SIGNAL PER PARAMETER. There are eight of them now -
   * a name, two multi-valued sets, two thresholds, a window and an ordering with a
   * direction - and a screen that read each one separately would have eight places
   * to forget one. `readCriteria` is also where a hand-typed `?branches=-4` is
   * refused, in one place rather than in eight.
   */
  protected readonly criteria = computed<Criteria>(() => readCriteria(this.query()));

  /** The name in the address bar. `''` when there is none. */
  protected readonly asked = computed(() => this.criteria().name);

  /** Whether anything beyond a name is being asked for. */
  protected readonly isRefined = computed(() => isRefined(this.criteria()));

  /** Every criterion applied, as the tags that take them off again. */
  protected readonly applied = computed<readonly Applied[]>(() => appliedTags(this.criteria()));

  /**
   * The page in the address bar, zero-based and never negative.
   *
   * `Number('')` is 0 and `Number('two')` is NaN, so both a missing parameter and a
   * hand-typed one land on the first page rather than on `NaN`, which would send
   * `page=NaN` to the server.
   */
  private readonly pageAsked = computed(() => {
    const page = Number(this.query().get('page') ?? 0);

    return Number.isFinite(page) ? Math.max(0, Math.trunc(page)) : 0;
  });

  constructor() {
    // THE ONE PLACE THE CALL IS ASKED FOR. Every control on this screen navigates;
    // this turns whatever the address ends up saying into the request. A control
    // that called the service directly would be a second source of truth, and the
    // one the back button does not reach.
    effect(() => this.practices.show({ criteria: this.criteria(), page: this.pageAsked() }));
  }

  /**
   * Puts the criteria and a page in the address bar.
   *
   * `null` REMOVES A PARAMETER rather than writing an empty one, so the unrefined
   * first page is `/practices` and not `/practices?name=&status=&page=0`. The
   * address a reader shares should say what they were looking at and nothing else.
   */
  private go(criteria: Criteria, page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...criteriaQuery(criteria), page: page === 0 ? null : page },
    });
  }

  /**
   * A criterion changed in the panel.
   *
   * BACK TO THE FIRST PAGE, ALWAYS. Page four of an unfiltered platform is not a
   * page of the suspended ones, and keeping the number asks for a page past the end
   * of a shorter list - a filter that found six and showed none.
   */
  protected refine(criteria: Criteria): void {
    this.go(criteria, 0);
  }

  /** One tag pressed: that criterion off, the rest exactly as they were. */
  protected remove(tag: Applied): void {
    this.go(tag.without, 0);
  }

  /**
   * Every refinement off, and the name search left alone.
   *
   * The name is not a filter the panel applied - it is what the reader typed, it is
   * the one thing the SERVER is matching, and clearing it along with the rest is
   * how a control labelled "clear the filters" loses somebody the search they were
   * in the middle of.
   */
  /** The one control the empty state offers when only a name is narrowing the list. */
  protected clearName(): void {
    this.go({ ...this.criteria(), name: '' }, 0);
  }

  protected clearFilters(): void {
    const criteria = this.criteria();

    // The name and the ordering survive: neither is a filter the panel applied.
    // Clearing the filters should not also rearrange a list somebody just sorted.
    this.go(
      { ...ANY, name: criteria.name, order: criteria.order, direction: criteria.direction },
      0,
    );
  }

  // ---------------------------------------------------------------------------
  // Ordering, which is on the columns
  // ---------------------------------------------------------------------------

  protected readonly columns = COLUMNS;

  /**
   * A column heading pressed: order by it, turn it round, or put it back.
   *
   * THREE STATES AND NOT TWO. A list that can only be sorted one way or the other
   * has no way back to the order the server sent, which is the only order that is
   * the same on every page of a platform this console has not read all of - so the
   * third press is what stops "as listed" being gone for good.
   *
   * THE FIRST PRESS GIVES THE READING SOMEBODY WANTED. Nobody sorts by staff to
   * find the smallest practice, and nobody sorts by date to see the oldest: a
   * figure and a date start at the top, a name starts at A.
   */
  protected sortBy(order: Order): void {
    const criteria = this.criteria();

    if (criteria.order !== order) {
      this.go({ ...criteria, order, direction: order === 'name' ? 'asc' : 'desc' }, 0);

      return;
    }

    const isLast = criteria.direction === (order === 'name' ? 'desc' : 'asc');

    this.go(
      isLast
        ? { ...criteria, order: '', direction: 'asc' }
        : { ...criteria, direction: criteria.direction === 'asc' ? 'desc' : 'asc' },
      0,
    );
  }

  /**
   * What the heading says to somebody who cannot see the arrow.
   *
   * It names what pressing it WOULD do rather than what is on screen, because that
   * is what a reader deciding whether to press it is asking - and the state itself
   * is already said by the rows underneath being in that order.
   */
  protected sortLabel(column: Column): string {
    const criteria = this.criteria();

    if (criteria.order !== column.order) {
      return `${column.label}: sort ${column.first}`;
    }

    return criteria.direction === (column.order === 'name' ? 'desc' : 'asc')
      ? `${column.label}: back to the order the server sent`
      : `${column.label}: sort ${column.second}`;
  }

  // ---------------------------------------------------------------------------
  // What is on screen
  // ---------------------------------------------------------------------------

  // Presented against the name the SERVER was asked for, never against what is in
  // the box: the rows on screen are the answer to the former, and marking them with
  // the latter would highlight a search that has not been run yet - or, mid-flight,
  // mark the previous page's rows with the term that is about to replace them.
  protected readonly rows = computed<readonly PracticeRow[]>(() => {
    const term = this.practices.name().trim();

    return this.practices.rows().map((practice, at) => presented(practice, at, term));
  });

  /**
   * The biggest branch and staff counts on the page, which the bars are drawn
   * against.
   *
   * RELATIVE TO THIS PAGE, NOT TO A LIMIT. A practice's seat limit is not in this
   * response at all, so there is no capacity to draw a bar against - see the class
   * note. What a bar CAN say honestly is how this practice compares with the others
   * in front of the reader, which is the question the row shape otherwise makes
   * hard: design §5 records that the counts sit at a different horizontal position
   * in every row, so comparing across practices means reading each one. The bars put
   * that comparison back in a column without pretending to be a capacity meter, and
   * the figure beside each one is the actual answer.
   */
  private readonly largest = computed(() => ({
    branches: Math.max(1, ...this.rows().map((row) => row.branches ?? 0)),
    staff: Math.max(1, ...this.rows().map((row) => row.staff ?? 0)),
  }));

  /** How wide a row's branch bar is drawn, as a percentage of the widest. */
  protected branchBar(row: PracticeRow): number {
    return share(row.branches, this.largest().branches);
  }

  protected staffBar(row: PracticeRow): number {
    return share(row.staff, this.largest().staff);
  }

  /**
   * The count inside the search field: `4 practices`, or `1 of 4` when filtered.
   *
   * The denominator is the last unfiltered total this screen saw, and it is left
   * out when there has not been one - see `Practices.totalUnfiltered`. Design §6
   * asks for `<matched> of <total>` and §6.2 flags that the response does not carry
   * the second number; this says what it knows rather than passing the filtered
   * count off as the platform's.
   */
  protected readonly count = computed(() => {
    if (!this.practices.haveArrived() || this.practices.haveFailed()) {
      return '';
    }

    const total = this.practices.total();
    const whole = this.practices.totalUnfiltered();
    const isNarrowed = this.practices.name().trim() !== '' || isRefined(this.practices.criteria());

    if (!isNarrowed) {
      return total === 1 ? '1 practice' : `${total} practices`;
    }

    return whole === undefined
      ? `${total} ${total === 1 ? 'practice' : 'practices'}`
      : `${total} of ${whole}`;
  });

  /**
   * The same fact in a sentence, for a reader who cannot see the field redraw.
   *
   * A search does not navigate to a new screen: the heading stays put, focus stays
   * put, and the rows are replaced without a sound. Empty while a call is in
   * flight, so what is announced is an answer rather than the previous answer being
   * re-read on every keystroke.
   */
  protected readonly announcement = computed(() => {
    if (this.practices.areLoading() || this.count() === '') {
      return '';
    }

    const name = this.practices.name().trim();
    const total = this.practices.total();
    const practices = total === 1 ? '1 practice' : `${total} practices`;

    if (name !== '') {
      // The filters are named in the tag row, which is on screen; repeating five of
      // them here is five clauses to sit through on every keystroke.
      return isRefined(this.practices.criteria())
        ? `${practices} matching “${name}” and the filters.`
        : `${practices} matching “${name}”.`;
    }

    return isRefined(this.practices.criteria())
      ? `${practices} matching the filters.`
      : `${practices} on the platform.`;
  });

  /**
   * Nothing has arrived yet: the first paint.
   *
   * It does not also ask whether a call is in flight. There is a moment before the
   * effect above has read the address in which nothing has been asked for either,
   * and "no call yet" and "call in flight" are the same thing to a reader - both
   * are a screen with no answer on it. Requiring `areLoading` here rendered the
   * empty state for that moment, which said "No practices yet" on a platform full
   * of them.
   */
  protected readonly isFirstLoad = computed(() => !this.practices.haveArrived());

  /**
   * The list came back empty because what was asked for matched nothing, not
   * because the platform is.
   *
   * A FILTER COUNTS AS ASKING. "No practices yet" under a panel filtering to
   * suspended practices on Basic is the same defect as showing it after a search -
   * it reports the platform as empty when what is empty is the answer.
   */
  protected readonly matchedNothing = computed(
    () =>
      this.rows().length === 0 &&
      (this.practices.name().trim() !== '' || isRefined(this.practices.criteria())),
  );

  /** There is no practice on this platform at all. The first one starts at onboarding. */
  protected readonly isEmpty = computed(
    () =>
      this.rows().length === 0 &&
      this.practices.name().trim() === '' &&
      !isRefined(this.practices.criteria()),
  );

  /**
   * What the empty state calls what was asked for.
   *
   * It names the search when there was one, because the reader typed it and the
   * screen owes it back to them; with filters on top it says so rather than
   * blaming the name for an answer the filters emptied.
   */
  protected readonly nothingTitle = computed(() => {
    const name = this.practices.name().trim();
    const refined = isRefined(this.practices.criteria());

    if (name === '') {
      return 'No practice matches these filters.';
    }

    return refined
      ? `No practice matches “${name}” with these filters.`
      : `No practice matches “${name}”.`;
  });

  /**
   * `Clear the search to see all 4 practices.` - or the same sentence without the
   * number, when no unfiltered page has been seen to count.
   */
  protected readonly clearInvitation = computed(() => {
    const whole = this.practices.totalUnfiltered();

    return whole === undefined
      ? 'to see every practice.'
      : `to see all ${whole} ${whole === 1 ? 'practice' : 'practices'}.`;
  });

  // ---------------------------------------------------------------------------
  // Searching
  // ---------------------------------------------------------------------------

  /**
   * `/` puts the cursor in the search box, from anywhere on the screen.
   *
   * It is what every console this reader also uses does, and it is the difference
   * between searching with one key and searching with a hand on the mouse. It is
   * ignored while they are typing into something - otherwise `/` could not be typed
   * into the search box itself - and while a modifier is held, so it never competes
   * with a browser shortcut.
   *
   * THE BOX IS THE PANEL'S, and this reaches it by id rather than by asking the
   * component for it: the shortcut is a fact about the SCREEN - it works from the
   * board, from the pager, from anywhere - and a control that only the component
   * holding it can operate is not a screen-level shortcut.
   */
  protected onShortcut(event: KeyboardEvent): void {
    const box = this.searchBox();
    const inControl =
      event.target instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);

    if (event.key === '/' && !inControl && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      box?.focus();

      return;
    }

    // Escape gives the box back: it clears a search that has one and blurs
    // otherwise, which is the pair of behaviours a reader expects from a field they
    // opened with a key.
    if (event.key === 'Escape' && event.target === box) {
      if (this.asked() === '') {
        box?.blur();
      } else {
        this.go({ ...this.criteria(), name: '' }, 0);
        box?.focus();
      }
    }
  }

  private searchBox(): HTMLInputElement | null {
    return (this.host.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#practice-search',
    );
  }

  // ---------------------------------------------------------------------------
  // Turning pages
  // ---------------------------------------------------------------------------

  protected readonly hasPrevious = computed(() => this.practices.page() > 0);

  protected readonly hasNext = computed(
    () => this.practices.page() + 1 < this.practices.pageCount(),
  );

  /** `1–25 of 137`. The numbers are the rows on screen, not the page size. */
  protected readonly range = computed(() => {
    const first = this.practices.page() * this.practices.pageSize + 1;

    return `${first}–${first + this.rows().length - 1} of ${this.practices.total()}`;
  });

  protected previousPage(): void {
    this.go(this.criteria(), this.practices.page() - 1);
  }

  protected nextPage(): void {
    this.go(this.criteria(), this.practices.page() + 1);
  }
}

/**
 * One row, from the server's shape to the two lines it is read on.
 *
 * The id is the row's identity and the list is tracked by it. A row that arrived
 * without one falls back to its position, which is stable for as long as the page
 * on screen is.
 */
function presented(practice: ListedOrganization, at: number, term: string): PracticeRow {
  const id = practice.id ?? `row-${at}`;
  const name = (practice.name ?? '').trim();
  const status = STATUSES[practice.status ?? ''];
  const word = status?.label ?? practice.status ?? '';
  const shown = name === '' ? 'Unnamed practice' : name;

  // ACTIVE IS NOT SAID, and every other status is. The pill carries the plan, which
  // is the fact that differs between rows; adding "active" to three rows in four
  // spends the reader's attention on the word that tells them nothing, and leaves
  // the two rows that do need acting on looking like the rest.
  const badge = [practice.plan, status?.tone === 'active' ? '' : word.toLowerCase()]
    .filter((part) => (part ?? '') !== '')
    .join(' · ');

  const onboardedOn = practice.createdAt === undefined ? '' : on(practice.createdAt);

  return {
    id,
    link: practicePath(id),
    name: shown,
    // A row with no name is standing in for one, and "Unnamed practice" is this
    // screen's words rather than the practice's - marking a match inside them would
    // claim the server matched something it never saw.
    parts: name === '' ? [{ text: shown, isHit: false }] : matched(shown, term),
    isUnnamed: name === '',
    badge: badge === '' ? '—' : badge,
    tone: status?.tone ?? 'unknown',
    badgeTone: status?.pill ?? 'quiet',
    // Closed is the one nobody has to act on, so it recedes. Suspended keeps its
    // weight: it is the row somebody may well have to do something about.
    isQuiet: status?.tone === 'closed',
    branches: practice.clinicCount,
    staff: practice.staffCount,
    onboarded: onboardedOn,
  };
}

/**
 * A name split around every run of it the search matched.
 *
 * WHY MARK IT AT ALL: a search for `care` answers with twenty-five rows and the
 * reader's next question is which part of each one is the answer - "Nile Care",
 * "Carewell", "Alexandria Homecare" match for three different reasons, and reading
 * the term back out of each name is work the screen can do once.
 *
 * MATCHED THE WAY THE SERVER MATCHES: anywhere in the name, ignoring case
 * (`LLD-ORGANIZATION.md` §2.8). It is `indexOf` over a folded copy rather than a
 * regular expression, because a name is not a pattern - a search for `St. Mary (2)`
 * would be a syntax error in one and three ordinary characters in the other.
 *
 * The runs come off the ORIGINAL string, so what is drawn is the practice's own
 * capitalisation and never the search's.
 */
function matched(name: string, term: string): readonly NamePart[] {
  if (term === '') {
    return [{ text: name, isHit: false }];
  }

  const folded = name.toLowerCase();
  const wanted = term.toLowerCase();
  const parts: NamePart[] = [];

  let from = 0;
  let at = folded.indexOf(wanted);

  while (at !== -1) {
    if (at > from) {
      parts.push({ text: name.slice(from, at), isHit: false });
    }

    parts.push({ text: name.slice(at, at + wanted.length), isHit: true });

    from = at + wanted.length;
    at = folded.indexOf(wanted, from);
  }

  if (from < name.length) {
    parts.push({ text: name.slice(from), isHit: false });
  }

  return parts;
}

/** A value as a percentage of the largest on the page, floored so a 1 is visible. */
function share(value: number | undefined, largest: number): number {
  if (value === undefined || value <= 0) {
    return 0;
  }

  // A practice with one branch beside one with forty would otherwise draw a bar
  // under a pixel wide, which reads as no bar at all - and "no bar" already means
  // "no count came back".
  return Math.max(6, Math.round((value / largest) * 100));
}

/** `1 Mar 2026`, or nothing for a date that is absent or unreadable. */
function on(value: string): string {
  const at = new Date(value);

  return Number.isNaN(at.getTime()) ? '' : ONBOARDED_ON.format(at);
}

// `onboarded` was here, wording the second line as "onboarded 1 Mar 2026". The
// column is headed Onboarded, so the word is above the figure rather than beside
// it - and it is NOT headed "Active since", which is how design §5 words that line:
// that sentence is about how long a practice has been in its current status, and
// `createdAt` is when it arrived. A suspended practice would have read "active
// since" under a pill saying it is not.

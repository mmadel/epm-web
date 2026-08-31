import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  ListedOrganization,
  PagedResponseListedOrganization,
  PlatformPracticesService,
} from 'api-client';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ANY, Criteria, facetsOf, Facets, matches, ordered } from './practice-criteria';

/**
 * How many practices a page of the screen holds.
 *
 * ONE VALUE, NOT A CONTROL. It was a 25 / 50 / 100 segmented control in the toolbar,
 * which was a question the reader had to answer before doing anything and which
 * answered nothing about a practice. Fifty is what a laptop shows about two screens
 * of, which is the length worth scrolling before turning a page.
 *
 * IT IS NOT THE SERVER'S PAGE ANY MORE either. The console reads the whole list and
 * pages what MATCHED - see the class note - so this is a decision about reading
 * rather than about the request, and the request always asks for {@link SWEEP_PAGE}.
 */
export const PAGE_SIZE = 50;

/**
 * How many searches back the field remembers.
 *
 * Five, because the list under an empty search box is an aid rather than a screen:
 * past about five it is something to read instead of something to glance at, and the
 * sixth entry is always the one nobody wanted.
 */
const RECENT_LIMIT = 5;

/** The page size a sweep reads with: the largest the route allows. */
const SWEEP_PAGE = 100;

/**
 * How many pages a sweep will read before it stops and says so.
 *
 * TWENTY PAGES IS TWO THOUSAND PRACTICES, and the cap is here because a console
 * that quietly issues four hundred requests to draw a filter is a console that
 * takes the platform down to answer "how many are suspended". Past this the screen
 * says what it read and what it did not - see {@link Practices.isPartial} - because
 * a filtered count over part of the platform, presented as the whole, is exactly
 * the lie this file exists to avoid.
 */
const SWEEP_LIMIT = 20;

/**
 * What the list is currently being asked for.
 *
 * THE SCREEN DOES NOT OWN THIS - THE URL DOES. `PracticeList` reads the query
 * parameters and calls {@link Practices.show}; every control on the screen changes
 * the URL and nothing else. That is what makes a search shareable and the back
 * button work (design §6, "the URL is the state").
 */
export interface Ask {
  readonly criteria: Criteria;
  readonly page: number;
}

/** A page of practices, or every page of them, as it arrived. */
interface Held {
  /** Every practice matching the name, up to the sweep's limit. */
  readonly rows: readonly ListedOrganization[];
  /** How many practices matched the NAME, which is all the server filters by. */
  readonly total: number;
  /** True when the platform has more pages than {@link SWEEP_LIMIT} would read. */
  readonly isPartial: boolean;
  /** When the answer arrived, which is what a "last 30 days" window is measured from. */
  readonly at: number;
}

/**
 * Every practice on the platform, filtered the way the reader asked.
 *
 * COUNTS, NEVER CONTENTS. `listOrganizations` answers with a practice's
 * registration and its branch and staff counts, and with nothing else - no person,
 * no email address, nothing clinical (`LLD-ORGANIZATION.md` §2.8). That boundary is
 * the reason this route exists rather than the console reusing anything from the
 * org slice, and it is the server's to hold: this file must never enrich a row by
 * calling something else. A platform administrator learns that a practice exists
 * and how big it is, never who is inside it.
 *
 * THE NAME SEARCH IS THE SERVER'S. `name` matches anywhere and ignores case, and it
 * is sent as a query rather than applied to the rows here: filtering a page of 25
 * client-side would search the page the reader happens to be on and quietly report
 * "no matches" for a practice sitting on page three.
 *
 * EVERY OTHER CRITERION IS THIS CONSOLE'S, AND IS APPLIED TO THE WHOLE LIST. The
 * route takes no status, no plan, no size and no ordering, so the screen either
 * offers none of them - which is what shipped, and what made an administrator page
 * through the platform by eye to find the suspended ones - or it reads the list and
 * answers them itself. It reads the list. What makes that defensible is that it
 * reads ALL of it: §6.1 was right that a filter applied to twenty-five rows reports
 * about the page, and this never does, because there is no page to report about
 * until the filtering is done. See {@link everything}.
 *
 * IT READS THE LIST ONCE PER NAME, AND ALWAYS. The sweep used to be conditional -
 * one page while nothing was refined, every page once something was - which meant
 * the panel's counts were absent until the reader had already filtered by something,
 * and the first thing they did was pay for a second round trip. The panel is always
 * on screen now, and every count on it is always true. On a platform that fits in
 * one page - which is most of them - this is still exactly one request.
 */
@Injectable({ providedIn: 'root' })
export class Practices {
  private readonly practices = inject(PlatformPracticesService);

  /**
   * `undefined` until the screen has read the address and said what to ask for.
   *
   * NOTHING IS CALLED BEFORE THEN, which is what the `undefined` is for: a resource
   * whose params are `undefined` is idle. Seeded with an empty ask instead, this
   * called the route once for the unfiltered first page and then again for whatever
   * the address actually said - so opening a shared `?name=care` link made two
   * requests and rendered the wrong one first.
   */
  private readonly ask = signal<Ask | undefined>(undefined);

  /**
   * THE ONLY THING THE SERVER IS EVER ASKED: a name, or nothing.
   *
   * The route filters by name and by nothing else, so every other criterion - a
   * status, a plan, a size, a date range, an ordering, which page is on screen -
   * changes what the reader sees without changing what the server would answer.
   * Keyed on anything wider than this, the panel re-read every page of the platform
   * each time somebody pressed an option in it.
   *
   * Blank is no filter, and it is sent as `undefined` rather than as an empty
   * string so that clearing the box makes the same request as never having typed in
   * it - the generated client drops an undefined parameter entirely.
   */
  private readonly asked = computed(() => this.ask()?.criteria.name.trim());

  // One sweep per name. `reload()` is the retry the failure state offers, and
  // nothing else reaches the route.
  private readonly listed = rxResource({
    params: () => this.asked(),
    stream: ({ params }) => this.everything(params),
  });

  /**
   * Every practice matching the name, however many pages the server keeps it on.
   *
   * THE FIRST PAGE IS WHAT SAYS HOW MANY THERE ARE. `totalPages` comes back with it,
   * so the rest are asked for together rather than one after another - nineteen
   * requests in parallel is one wait, and nineteen in sequence is nineteen.
   *
   * IT READS AT MOST {@link SWEEP_LIMIT} PAGES and reports when there were more, so
   * that a platform too big for this to be honest says so on the screen instead of
   * presenting a filtered count of the first two thousand as a filtered count of
   * the platform.
   *
   * This is a workaround for a route that takes no filters, and it is written as
   * one. When `listOrganizations` learns `status`, `plan` and `sort`, this method
   * is what gets deleted - the criteria, the panel and every count on it stay
   * exactly as they are.
   */
  private everything(asked: string): Observable<Held> {
    const name = asked || undefined;

    return this.practices.listOrganizations(name, 0, SWEEP_PAGE).pipe(
      switchMap((first) => {
        const pages = Math.min(first.totalPages ?? 1, SWEEP_LIMIT);

        if (pages <= 1) {
          return of([first]);
        }

        return forkJoin(
          Array.from({ length: pages - 1 }, (_, at) =>
            this.practices.listOrganizations(name, at + 1, SWEEP_PAGE),
          ),
        ).pipe(map((rest) => [first, ...rest]));
      }),
      map((pages) => held(pages[0], pages)),
    );
  }

  /**
   * The last answer, kept while the next one is in flight.
   *
   * WITHOUT THIS THE TABLE BLINKS TO EMPTY between pages: a resource whose params
   * change has no value until the new one arrives, so pressing Next would clear the
   * rows, collapse the page to the height of its heading, and fill it again a
   * moment later. Holding the previous page means the rows a reader is mid-sentence
   * in stay exactly as they are; what changes while loading is a ring in the board's
   * head - see `.spinner`.
   *
   * It is deliberately NOT held through a failure: `haveFailed` takes the screen,
   * because rows left on display under an error message read as the result of the
   * search that just failed.
   */
  private readonly loaded = linkedSignal<Held | undefined, Held | undefined>({
    // `hasValue()` before `value()`: a resource in an error state THROWS from
    // `value()`, and reading it unguarded puts that throw inside change detection -
    // where it takes down the whole screen, including the retry the reader needs.
    source: () => (this.listed.hasValue() ? this.listed.value() : undefined),
    computation: (arrived, previous) => arrived ?? previous?.value,
  });

  /** What is currently being asked for, which the screen and the panel both read. */
  readonly criteria = computed<Criteria>(() => this.ask()?.criteria ?? ANY);

  /** The name being matched on, or `''`. What the empty state reads to word itself. */
  readonly name = computed(() => this.criteria().name);

  /**
   * Every practice that matched, in the order asked for.
   *
   * Only meaningful when the whole set was read; a single page has already been
   * filtered by the server as far as it can be, and re-filtering it here is the one
   * thing this file will not do.
   */
  private readonly matched = computed<readonly ListedOrganization[]>(() => {
    const answer = this.loaded();

    if (answer === undefined) {
      return [];
    }

    const criteria = this.criteria();

    return ordered(
      answer.rows.filter((row) => matches(row, criteria)),
      criteria,
    );
  });

  /**
   * The practices on the page being shown.
   *
   * PAGED HERE WHEN THE SET WAS READ HERE. The server's paging is over what the
   * server matched, which is the name and nothing else - so once a status or an
   * ordering is applied, its page boundaries are boundaries of the wrong list.
   */
  readonly rows = computed<readonly ListedOrganization[]>(() => {
    const from = this.page() * PAGE_SIZE;

    return this.matched().slice(from, from + PAGE_SIZE);
  });

  /** How many practices the current criteria have in total, across every page. */
  readonly total = computed(() => this.matched().length);

  /** Which page is on screen, zero-based, and how many there are. */
  readonly page = computed(() => this.ask()?.page ?? 0);

  readonly pageCount = computed(() => Math.ceil(this.total() / PAGE_SIZE));

  /** Every option the panel offers, counted over what was actually read. */
  readonly facets = computed<Facets | undefined>(() => {
    const answer = this.loaded();

    return answer === undefined ? undefined : facetsOf(answer.rows, this.criteria(), answer.at);
  });

  /**
   * When the answer arrived, which is what a date control offers as "today".
   *
   * The screen does not read the clock itself: a window computed inside a `computed`
   * moves under the reader, and two controls on one screen disagreeing about what
   * day it is would be a defect nobody could reproduce.
   */
  readonly at = computed(() => this.loaded()?.at);

  /**
   * How many practices the criteria were applied to, when that is not all of them.
   *
   * `undefined` unless the platform has more than a sweep will read. The panel says
   * so in words, because a count over the first two thousand presented as a count
   * over the platform is the one failure this whole arrangement exists to avoid.
   */
  readonly readSoFar = computed(() =>
    this.loaded()?.isPartial === true ? this.loaded()?.rows.length : undefined,
  );

  /** True while a first call, a page turn, a search, a refinement or a retry is in flight. */
  readonly areLoading = this.listed.isLoading;

  /**
   * True when the call failed.
   *
   * The screen says so and offers {@link retry}. What it must not do is render an
   * empty table: "no practices on this platform" and "we could not ask" are
   * different facts, and the first one is how somebody onboards a duplicate.
   */
  readonly haveFailed = computed(() => this.listed.error() !== undefined);

  /** Whether anything has arrived yet, for telling a first load from a page turn. */
  readonly haveArrived = computed(() => this.loaded() !== undefined);

  /**
   * How many practices there are when nothing is being asked for.
   *
   * THE SEARCH FIELD READS `1 of 4`, and the `4` is not in a filtered response -
   * `totalElements` is the count of what matched the name. Design §6.2 raises
   * exactly this and says it must be settled when the route is signed off; it was
   * not, so this remembers the total from the last unrefined answer instead of
   * inventing one. It is `undefined` until one has been seen, and the field then
   * says `1 practice` rather than claiming a denominator nobody sent.
   */
  readonly totalUnfiltered = linkedSignal<number | undefined, number | undefined>({
    // THE SERVER'S TOTAL AND NOT THE MATCHED ONE. With no name in the box that
    // figure is the whole platform however many criteria the panel is applying,
    // because the name is the only thing the route filters by - so `3 of 40` stays
    // true while the panel narrows forty practices down to three.
    source: () => (this.name().trim() === '' ? this.loaded()?.total : undefined),
    computation: (unfiltered, previous) => unfiltered ?? previous?.value,
  });

  private readonly remembered = signal<readonly string[]>([]);

  /**
   * The searches this session has run, most recent first.
   *
   * HERE RATHER THAN ON THE SCREEN, and it is worth saying why: this service is
   * `providedIn: 'root'`, so the list survives opening a practice and coming back -
   * which is the one journey the feature exists for. A platform administrator
   * chasing a support thread searches, opens the practice, returns, and searches
   * again for something adjacent; a list held in the component would be empty every
   * time they came back to it.
   *
   * IT IS IN MEMORY AND NOWHERE ELSE. A practice's name is not clinical, but it is
   * still somebody's account written to a shared workstation's disk, and nothing on
   * this screen is worth that - see the class note on what this route is allowed to
   * know. Closing the tab forgets it.
   */
  readonly recent = this.remembered.asReadonly();

  /**
   * Asks for a page of practices matching the criteria.
   *
   * The screen calls this from the URL and from nowhere else. Going back to the
   * first page when the criteria change is the caller's job for the same reason:
   * it is one URL, and a filter with somebody else's page number in it is an
   * address that answers an empty page.
   */
  show(ask: Ask): void {
    this.ask.update((current) => (isSameAsk(current, ask) ? current : ask));

    this.remember(ask.criteria.name);
  }

  /** How many rows a page of the screen holds. Fixed - see {@link PAGE_SIZE}. */
  readonly pageSize = PAGE_SIZE;

  /**
   * Puts a name at the top of {@link recent}, if it is one worth keeping.
   *
   * A TERM THE NEXT ONE GREW OUT OF IS DROPPED. The field asks 300ms after the last
   * keystroke, so a reader who pauses mid-word runs two searches - `car`, then
   * `care` - and a list that kept both would fill with the halves of one word. The
   * one that was typed on top of is the one nobody would pick again.
   *
   * Matching ignores case for the same reason the server's does: `Nile` and `nile`
   * are the same search, and offering both back is offering the same thing twice.
   */
  private remember(name: string): void {
    const term = name.trim();

    if (term === '') {
      return;
    }

    const folded = term.toLowerCase();

    this.remembered.update((kept) =>
      [term, ...kept.filter((seen) => !folded.startsWith(seen.toLowerCase()))].slice(
        0,
        RECENT_LIMIT,
      ),
    );
  }

  retry(): void {
    this.listed.reload();
  }
}

/** One answer, or every page of one, as the screen reads it. */
function held(
  first: PagedResponseListedOrganization,
  pages: readonly PagedResponseListedOrganization[],
): Held {
  return {
    rows: pages.flatMap((one) => one.content ?? []),
    total: first.totalElements ?? 0,
    isPartial: (first.totalPages ?? 0) > SWEEP_LIMIT,
    // Read once, when the answer arrived, rather than on every recount: a window
    // measured from `Date.now()` inside a computed moves under the reader, and
    // "onboarded in the last 30 days" would quietly change what it means while a
    // page is open.
    at: Date.now(),
  };
}

/**
 * Whether two asks are the same question.
 *
 * The criteria are compared field by field because they are rebuilt from the query
 * parameters on every navigation: two identical asks are never the same object, and
 * an identity check would make every navigation a fresh ask - which would recompute
 * every count on the panel on every keystroke that changed nothing.
 */
function isSameAsk(current: Ask | undefined, next: Ask): boolean {
  if (current === undefined) {
    return false;
  }

  const a = current.criteria;
  const b = next.criteria;

  return (
    current.page === next.page &&
    a.name === b.name &&
    a.branches === b.branches &&
    a.staff === b.staff &&
    a.from === b.from &&
    a.to === b.to &&
    a.order === b.order &&
    a.direction === b.direction &&
    same(a.statuses, b.statuses) &&
    same(a.plans, b.plans)
  );
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((one, at) => one === b[at]);
}

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { inject as injectFn } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  BASE_PATH,
  ListedOrganization,
  ListedOrganizationStatusEnum,
  PagedResponseListedOrganization,
} from 'api-client';
import { API_BASE_URL, provideApiBaseUrl } from 'core';

import { PracticeList } from './practice-list';

/**
 * The landing screen, driven the way a person drives it.
 *
 * EVERY ASSERTION IS ABOUT THE REQUEST, THE ADDRESS, OR THE DOM. The request,
 * because what this screen filters and pages by is the server's job and a test that
 * read the component's signals would pass while the wrong query went out. The
 * address, because the URL is the state (design §6) and a control that changed the
 * screen without changing it would break the back button silently. The DOM, because
 * the two things that matter most - that a failure is not rendered as an empty
 * platform, and that the row says a practice's size and never its contents - are
 * only wrong on screen.
 */
const LIST_URL = 'https://api.test.invalid/api/v1/platform/organizations';

const NILE: ListedOrganization = {
  id: 'org-1',
  name: 'Nile Care',
  plan: 'Standard',
  status: ListedOrganizationStatusEnum.Active,
  clinicCount: 2,
  staffCount: 6,
  createdAt: '2026-03-01T09:00:00Z',
};

const DELTA: ListedOrganization = {
  id: 'org-2',
  name: 'Delta Physio',
  plan: 'Basic',
  status: ListedOrganizationStatusEnum.Suspended,
  clinicCount: 1,
  staffCount: 3,
  createdAt: '2026-02-11T09:00:00Z',
};

const CAIRO: ListedOrganization = {
  id: 'org-3',
  name: 'Cairo Heart Centre',
  plan: 'Basic',
  status: ListedOrganizationStatusEnum.Closed,
  clinicCount: 3,
  staffCount: 12,
  createdAt: '2026-01-02T09:00:00Z',
};

/** A platform of `count` practices, which is how the pager gets more than one page. */
function many(count: number): readonly ListedOrganization[] {
  return Array.from({ length: count }, (_, at) => ({
    ...NILE,
    id: `org-${at + 1}`,
    name: `Practice ${at + 1}`,
  }));
}

/** A page of the answer, with the paging members the screen reads. */
function page(
  content: readonly ListedOrganization[],
  extra: Partial<PagedResponseListedOrganization> = {},
): PagedResponseListedOrganization {
  return {
    content: [...content],
    page: 0,
    size: 25,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    ...extra,
  };
}

class Harness {
  constructor(
    readonly fixture: ComponentFixture<PracticeList>,
    readonly http: HttpTestingController,
  ) {}

  get element(): HTMLElement {
    return this.fixture.nativeElement as HTMLElement;
  }

  /**
   * Renders whatever the last interaction changed.
   *
   * NOT `whenStable()`: in a zoneless application an unanswered `HttpClient`
   * request is a pending task, and every test that deliberately leaves one in
   * flight would hang until the runner's timeout.
   *
   * SEVERAL TURNS, because every control on this screen navigates and a navigation
   * settles over more than one of them: the router resolves the URL, the query
   * parameters emit, the effect asks the service, and only then is there a request
   * to expect.
   *
   * `advanceTimersByTimeAsync(0)` rather than an awaited microtask, because the
   * clock here is fake - the search box debounces - and a router navigation waits
   * on a zero-delay timer that a fake clock is holding. Zero milliseconds runs what
   * is already due and leaves the 300ms search delay where it is, which is what
   * lets the "waits for the typing to stop" test mean anything.
   */
  async settle(): Promise<void> {
    for (let turn = 0; turn < 4; turn += 1) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
    }

    TestBed.tick();
  }

  get text(): string {
    return (this.element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  get url(): string {
    return TestBed.inject(Router).url;
  }

  all(selector: string): readonly HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>(selector)];
  }

  query<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }

  /** The practice named in each row, top to bottom. */
  get names(): readonly string[] {
    return this.all('.practice__name').map((cell) => (cell.textContent ?? '').trim());
  }

  /** The run of each name the search matched, which the row marks. */
  get marked(): readonly string[] {
    return this.all('.practice__hit').map((hit) => hit.textContent ?? '');
  }

  /** The searches the field is offering back, in the order it offers them. */
  get recent(): readonly string[] {
    return this.all('.search__recent-item').map((term) => (term.textContent ?? '').trim());
  }

  /** Puts focus in the search box the way a pointer or the Tab key does. */
  async focusSearch(): Promise<void> {
    this.query<HTMLInputElement>('#practice-search')!.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    await this.settle();
  }

  /** Each row's figures, in the columns they are aligned in. */
  get figures(): readonly { branches: string; staff: string; onboarded: string }[] {
    return this.all('.practice__open').map((row) => {
      const cells = [...row.querySelectorAll('.cell')].map((cell) =>
        (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );

      return {
        branches: cells[0] ?? '',
        staff: cells[1] ?? '',
        onboarded: (row.querySelector('.practice__onboarded')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    });
  }

  /** How wide each row's branch bar is drawn, as the style attribute sets it. */
  get branchBars(): readonly string[] {
    return this.all('.cell__bar:not(.cell__bar--staff)').map((bar) => bar.style.inlineSize);
  }

  /** Everything the rows say, and nothing the page says around them. */
  get rowText(): string {
    return (this.query('.board__rows')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  private held: TestRequest | undefined;

  /**
   * The one request in flight, whatever it was asked for.
   *
   * HELD RATHER THAN LOOKED UP EACH TIME: `expectOne` takes the request off the
   * controller's queue, so reading what was asked for and then answering it would
   * look for a second request that was never made.
   */
  get pending(): TestRequest {
    this.held ??= this.http.expectOne((request) => request.url === LIST_URL);

    return this.held;
  }

  /** What the last request asked for, as query parameters. */
  get asked(): { name: string | null; page: string | null; size: string | null } {
    const { params } = this.pending.request;

    return {
      name: params.get('name'),
      page: params.get('page'),
      size: params.get('size'),
    };
  }

  async answer(body: PagedResponseListedOrganization): Promise<void> {
    this.pending.flush(body);
    this.held = undefined;
    await this.settle();
  }

  async fail(): Promise<void> {
    this.pending.flush({ code: 'EPM-XXX-000' }, { status: 503, statusText: 'Service Unavailable' });
    this.held = undefined;
    await this.settle();
  }

  async type(value: string): Promise<void> {
    const box = this.query<HTMLInputElement>('#practice-search')!;

    box.value = value;
    box.dispatchEvent(new Event('input'));
    await this.settle();
  }

  /** Types, then lets the search delay run out - which is what changes the address. */
  async search(value: string): Promise<void> {
    await this.type(value);
    await vi.advanceTimersByTimeAsync(400);
    await this.settle();
  }

  async press(label: string): Promise<void> {
    const found = this.all('button').find((button) => (button.textContent ?? '').trim() === label);

    if (found === undefined) {
      throw new Error(
        `No button labelled "${label}". Buttons: ${this.all('button')
          .map((button) => (button.textContent ?? '').trim())
          .join(' | ')}`,
      );
    }

    found.click();
    await this.settle();
  }

  /**
   * Asks for something by going to the address that asks for it.
   *
   * WHILE THE BAND IS COMMENTED OUT this is the only way to change a criterion, and
   * it is not a workaround: the address IS the state on this screen, and the box
   * raised exactly this event 300ms after the last keystroke. What these tests lose
   * is the typing, which the skipped ones above cover and which comes back with the
   * band; what they keep is every assertion about what the list then does.
   */
  async go(url: string): Promise<void> {
    TestBed.inject(Router).navigateByUrl(url);
    await this.settle();
  }

  /** Goes back, the way the browser does. */
  async back(): Promise<void> {
    TestBed.inject(Router).navigateByUrl(previous);
    await this.settle();
  }

  // ---------------------------------------------------------------------------
  // The refine panel
  // ---------------------------------------------------------------------------

  /** Every request currently in flight, whatever it asked for. */
  get requests(): readonly TestRequest[] {
    return this.http.match((request) => request.url === LIST_URL);
  }

  /**
   * Answers a sweep: the page that says how many there are, then all the rest.
   *
   * TWO WAVES, because that is how `Practices.everything` reads it - the first page
   * carries `totalPages`, and the others cannot be asked for until it has. A test
   * that flushed them all at once would be answering requests nobody had made yet.
   */
  async answerWhole(
    pages: readonly (readonly ListedOrganization[])[],
    claims = pages.length,
  ): Promise<void> {
    const all = pages.flat();
    const of = (at: number): PagedResponseListedOrganization => ({
      content: [...(pages[at] ?? [])],
      page: at,
      size: 100,
      totalElements: all.length,
      totalPages: claims,
    });

    this.pending.flush(of(0));
    this.held = undefined;
    await this.settle();

    if (claims > 1) {
      for (const request of this.requests) {
        request.flush(of(Number(request.request.params.get('page'))));
      }

      await this.settle();
    }
  }

  /** Presses one of the one-press views. */
  async pressView(label: string): Promise<void> {
    const view = this.all('.view').find((one) =>
      (one.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith(label),
    );

    if (view === undefined) {
      throw new Error(`No view "${label}". Views: ${this.views.join(' | ')}`);
    }

    view.click();
    await this.settle();
  }

  /** What the views row is offering, and how many each would leave. */
  get views(): readonly string[] {
    return this.all('.view').map((view) => (view.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  /** Presses a column heading, which is how this list is ordered. */
  async sortByColumn(label: string): Promise<void> {
    const column = this.all('.board__column').find((head) =>
      (head.textContent ?? '').trim().startsWith(label),
    );

    column?.click();
    await this.settle();
  }

  /** The column the list is arranged by, and which way round. */
  get sortedColumn(): string {
    const column = this.query('.board__column--sorted');

    return column === null ? '' : (column.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /**
   * The menu for a criterion, opened if it is not already.
   *
   * Found by what its trigger says rather than by position: the band is a row of
   * controls that look alike, and a test reaching for the second one would pass
   * while pointing at the wrong criterion.
   */
  private async menu(group: string): Promise<HTMLElement> {
    const menus = this.all('app-filter-menu');
    const found = menus.find(
      (one) => (one.querySelector('.menu__group')?.textContent ?? '').trim() === group,
    );

    if (found === undefined) {
      throw new Error(
        `No "${group}" menu. Menus: ${menus
          .map((one) => (one.querySelector('.menu__group')?.textContent ?? '').trim())
          .join(' | ')}`,
      );
    }

    if (found.querySelector('.menu__list') === null) {
      found.querySelector<HTMLButtonElement>('.menu__trigger')!.click();
      await this.settle();
    }

    return found;
  }

  /** Chooses an option out of a menu, the way a pointer does. */
  async choose(group: string, label: string): Promise<void> {
    const menu = await this.menu(group);
    const option = [...menu.querySelectorAll<HTMLElement>('.menu__option')].find((one) =>
      (one.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith(label),
    );

    if (option === undefined) {
      throw new Error(
        `No "${label}" in ${group}. Options: ${[...menu.querySelectorAll('.menu__option')]
          .map((one) => (one.textContent ?? '').replace(/\s+/g, ' ').trim())
          .join(' | ')}`,
      );
    }

    option.querySelector('input')?.click();
    await this.settle();
  }

  /** Takes a whole criterion off from inside its own menu. */
  async chooseAny(group: string): Promise<void> {
    const menu = await this.menu(group);

    menu.querySelector<HTMLButtonElement>('.menu__any')!.click();
    await this.settle();
  }

  private menuAt(group: string): HTMLElement | undefined {
    return this.all('app-filter-menu').find(
      (one) => (one.querySelector('.menu__group')?.textContent ?? '').trim() === group,
    );
  }

  /**
   * What a menu is offering, and the count beside each option.
   *
   * It opens the menu to read it, because that is what a reader does: the counts are
   * inside the control rather than under it, which is the trade the band makes for
   * being one row instead of five.
   */
  async counts(group: string): Promise<readonly string[]> {
    const menu = await this.menu(group);

    return [...menu.querySelectorAll<HTMLElement>('.menu__option')].map((option) =>
      (option.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
  }

  /** What a menu's own face says it is set to. */
  summary(group: string): string {
    return (this.menuAt(group)?.querySelector('.menu__summary')?.textContent ?? '').trim();
  }

  /** Types a date into one end of the range. */
  async setDate(which: 'from' | 'to', value: string): Promise<void> {
    const input = this.all('.dates__input')[which === 'from' ? 0 : 1] as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('change'));
    await this.settle();
  }

  /**
   * The criteria the tag row is currently saying are applied.
   *
   * Read span by span rather than off `textContent`: the gap between the group and
   * its value is a flex gap, so the text nodes have no space between them.
   */
  get tags(): readonly string[] {
    return this.all('.applied__tag').map((tag) =>
      [...tag.querySelectorAll('span')]
        .slice(0, 2)
        .map((part) => (part.textContent ?? '').trim())
        .join(' '),
    );
  }
}

/** Where {@link Harness.back} returns to. Set by the test that needs it. */
let previous = '/';

/**
 * Opens the screen with the first page already answered, unless asked not to.
 *
 * `provideApiBaseUrl` and `BASE_PATH` are wired exactly as the application wires
 * them, so the URL these tests assert on is the URL the console really builds.
 */
async function openList(options?: {
  answer?: PagedResponseListedOrganization | 'unanswered' | 'failed';
}): Promise<Harness> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', title: 'Practices', component: PracticeList }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
    ],
  });

  // The router has to have run once for the screen's query parameters to exist.
  await TestBed.inject(Router).navigateByUrl('/');

  const fixture = TestBed.createComponent(PracticeList);
  const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

  await harness.settle();

  const answer = options?.answer ?? page([NILE, DELTA]);

  if (answer === 'failed') {
    await harness.fail();
  } else if (answer !== 'unanswered') {
    await harness.answer(answer);
  }

  return harness;
}

/**
 * THIRTY `it.skip`s IN THIS FILE, AND THEY ARE ALL ONE THING. The search band is
 * commented out of `practice-list.html` while its design is reworked, so every test
 * that types into the box, opens a filter menu, presses a view or reads the band's
 * own count has no control to drive. They are skipped rather than deleted because
 * nothing behind them changed: uncomment the band and they pass again as they are.
 *
 * WHAT WAS NOT SKIPPED. A test whose subject is the LIST rather than the band was
 * rewired to ask through the address instead - see `Harness.go`. Marking the matched
 * run in a name, sending the name to the server rather than filtering the page,
 * announcing the result, the ring on the board, the rows a failure must not leave
 * behind: all of that is about what the list does with a criterion, and the band was
 * only ever how the criterion got set.
 */
describe('PracticeList', () => {
  beforeEach(() => {
    // The search box debounces before navigating, so the clock is the screen's own.
    // Every test that does not search never advances it, and the timer never fires.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // What it asks for
  // ---------------------------------------------------------------------------

  it('reads the list rather than a page of it when it opens', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // The console answers status, plan, size, dates and ordering itself, so it reads
    // the whole list at the largest page the route allows and filters that. On a
    // platform that fits in one page - most of them - this is still one request.
    expect(harness.asked).toEqual({ name: null, page: '0', size: '100' });
  });

  // ---------------------------------------------------------------------------
  // Finding things
  // ---------------------------------------------------------------------------

  it.skip('puts the cursor in the search box when / is pressed', async () => {
    const harness = await openList();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    await harness.settle();

    // It is the difference between searching with one key and searching with a hand
    // on the mouse, and it is what every console this reader also uses does.
    expect(document.activeElement).toBe(harness.query('#practice-search'));
  });

  it.skip('lets / be typed into the search box itself', async () => {
    const harness = await openList();

    const box = harness.query<HTMLInputElement>('#practice-search')!;

    box.focus();
    const typed = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });

    box.dispatchEvent(typed);

    // Swallowed here, the shortcut would make the one character the field cannot
    // hold be the one it is opened with.
    expect(typed.defaultPrevented).toBe(false);
  });

  it.skip('clears the search when Escape is pressed in the box', async () => {
    const harness = await openList();

    await harness.search('care');
    await harness.answer(page([NILE]));

    harness
      .query<HTMLInputElement>('#practice-search')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await harness.settle();

    expect(harness.asked.name).toBeNull();
  });

  it.skip('shows the shortcut on the field, and hides it once the field is in use', async () => {
    const harness = await openList();

    expect(harness.query('.search__key')?.textContent?.trim()).toBe('/');

    await harness.focusSearch();

    // The reader is already here; the badge is now something in the way of the text
    // they are about to type.
    expect(harness.query('.search__key')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Rows per page
  // ---------------------------------------------------------------------------

  it('lists every practice the server sent, in the order it sent them', async () => {
    const harness = await openList();

    expect(harness.names).toEqual(['Nile Care', 'Delta Physio']);
  });

  // ---------------------------------------------------------------------------
  // The row - design §5
  // ---------------------------------------------------------------------------

  it('puts the figures in columns, each one naming itself', async () => {
    const harness = await openList({ answer: page([NILE]) });

    // The column headings are `aria-hidden` - five more words before every practice
    // otherwise - so each figure carries its own label instead.
    expect(harness.names).toEqual(['Nile Care']);
    expect(harness.figures).toEqual([
      { branches: 'Branches:2', staff: 'Staff:6', onboarded: 'Onboarded:1 Mar 2026' },
    ]);
  });

  it('draws each count against the biggest practice on the page', async () => {
    const harness = await openList({
      answer: page([
        { ...NILE, clinicCount: 10 },
        { ...DELTA, clinicCount: 5 },
        { ...CAIRO, clinicCount: 1 },
      ]),
    });

    // Relative to this page and not to a limit: the list response carries no
    // allowance of any kind, so a bar drawn against one would be invented. The
    // smallest is floored so that a 1 beside a 10 is still a visible mark rather
    // than nothing - and nothing already means "no count came back".
    expect(harness.branchBars).toEqual(['100%', '50%', '10%']);
  });

  it('carries the status on the row’s leading edge', async () => {
    const harness = await openList({ answer: page([NILE, DELTA, CAIRO]) });

    const tones = harness
      .all('.board__rows .practice__edge')
      .map((edge) => edge.className.replace('practice__edge ', ''));

    expect(tones).toEqual([
      'practice__edge--active',
      'practice__edge--suspended',
      'practice__edge--closed',
    ]);
  });

  it('says the plan on the badge, and the status only when it is worth saying', async () => {
    const harness = await openList({ answer: page([NILE, DELTA, CAIRO]) });

    // "Active" on three rows in four spends the reader's attention on the word
    // that tells them nothing, and leaves the rows that need acting on looking
    // like the rest.
    expect(harness.all('.pill').map((pill) => (pill.textContent ?? '').trim())).toEqual([
      'Standard',
      'Basic · suspended',
      'Basic · closed',
    ]);
  });

  it('opens the practice from the whole row, with the chevron §5 asks for', async () => {
    const harness = await openList({ answer: page([NILE, DELTA]) });

    // One link per practice, covering the row - not an "Open" button on the end of
    // it, which would be a target the size of a word and a second tab stop per row.
    const opens = harness.all('.board__rows .practice__open') as HTMLAnchorElement[];

    expect(opens.map((open) => open.getAttribute('href'))).toEqual([
      '/practices/org-1',
      '/practices/org-2',
    ]);
    expect(harness.all('.board__rows .practice__chevron')).toHaveLength(2);
  });

  it('offers no edit control, because no route would answer one', async () => {
    const harness = await openList();

    // The platform API is four operations - list, read one, onboard, list plans -
    // and none of them changes a practice. This fails if somebody adds the button
    // before the route exists.
    const labels = harness.all('button').map((button) => (button.textContent ?? '').trim());

    expect(labels.filter((label) => /edit|delete|suspend/i.test(label))).toEqual([]);
  });

  it('runs the list edge to edge, as the frame around it does', async () => {
    const harness = await openList();

    // 60rem is a measure for reading a form. Any cap on a list of short rows inside
    // a full-bleed frame reads as a screen that failed to load rather than one that
    // fits.
    expect(harness.query('.stage')?.classList.contains('stage--full')).toBe(true);
  });

  it('lets a closed practice recede rather than shout', async () => {
    const harness = await openList({ answer: page([NILE, DELTA, CAIRO]) });

    const quiet = harness.all('.practice').map((row) => row.classList.contains('practice--quiet'));

    // A lapsed practice is the one nobody has to act on, and `PRODUCT.md` is
    // explicit that it is not an error state. Suspended keeps its weight.
    expect(quiet).toEqual([false, false, true]);
  });

  it('hides the bar from a reader who is being told the figure', async () => {
    const harness = await openList({ answer: page([NILE]) });

    // The bar is the same number drawn. Announced as well, it is a second reading
    // of one fact, twice per row, across twenty-five rows.
    for (const track of harness.all('.cell__track')) {
      expect(track.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('draws a dash and no bar for a count that did not arrive', async () => {
    const harness = await openList({
      answer: page([{ ...NILE, clinicCount: undefined, staffCount: undefined }]),
    });

    // A practice with no branches and a practice whose count did not arrive are
    // different facts. In a column a dash is the honest rendering of the second -
    // and a bar of zero width would read as the first.
    expect(harness.figures).toEqual([
      { branches: 'Branches:—', staff: 'Staff:—', onboarded: 'Onboarded:1 Mar 2026' },
    ]);
    expect(harness.branchBars).toEqual([]);
  });

  it('keeps the server’s word for a status this build has not been taught', async () => {
    const harness = await openList({
      answer: page([{ ...NILE, status: 'ARCHIVED' as ListedOrganizationStatusEnum }]),
    });

    // Not dropped and not blank: a status nobody has styled is still the practice's
    // status, and hiding it would report a state that is not the one the server has.
    expect(harness.query('.pill')?.textContent?.trim()).toBe('Standard · archived');
    expect(harness.query('.board__rows .practice__edge')?.className).toContain(
      'practice__edge--unknown',
    );
  });

  // ---------------------------------------------------------------------------
  // The boundary this screen exists to hold
  // ---------------------------------------------------------------------------

  it('shows a practice’s size and never its contents', async () => {
    const harness = await openList();

    // Asserted on the rows rather than on the whole screen, because the footnote
    // under them says the words "nothing clinical" on purpose.
    expect(harness.rowText).toContain('Nile Care');
    expect(harness.rowText).toContain('Branches:');

    // The API's noun for a branch is `clinicCount`; it is not the word on screen.
    expect(harness.rowText).not.toContain('clinic');

    // No row names a person or a patient. The route does not answer with either,
    // and this fails the moment somebody enriches a row from a second call.
    for (const forbidden of ['patient', 'Patient', '@']) {
      expect(harness.rowText).not.toContain(forbidden);
    }
  });

  it('states the boundary on the page, for an administrator who has not read PRODUCT.md', async () => {
    const harness = await openList();

    expect(harness.query('.boundary')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Shows how big a practice is, never who is inside it. No patients, no named staff, nothing clinical.',
    );
  });

  // ---------------------------------------------------------------------------
  // The URL is the state - design §6
  // ---------------------------------------------------------------------------

  it.skip('puts the search in the address, so it can be shared', async () => {
    const harness = await openList();

    await harness.search('care');

    expect(harness.url).toBe('/?name=care');
  });

  it('leaves the address clean when nothing is being asked for', async () => {
    const harness = await openList();

    // Not `/?name=&page=0`. The address a reader shares should say what they were
    // looking at and nothing else.
    expect(harness.url).toBe('/');
  });

  it('reads a name out of the address it was opened at', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', title: 'Practices', component: PracticeList }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiBaseUrl('https://api.test.invalid'),
        { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
      ],
    });

    await TestBed.inject(Router).navigateByUrl('/?name=care');

    const fixture = TestBed.createComponent(PracticeList);
    const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

    await harness.settle();

    // A shared link asks the server for the search it names. The half of this that
    // checked the box echoed it back is with the band, and is skipped above.
    expect(harness.asked.name).toBe('care');
  });

  it.skip('follows the address back when the browser goes back', async () => {
    const harness = await openList();

    await harness.go('/?name=care');
    await harness.answer(page([NILE], { totalElements: 1, totalPages: 1 }));

    previous = '/';
    await harness.back();

    // The box follows the address. A plain signal would leave it saying "care"
    // after Back had taken the search away.
    expect(harness.query<HTMLInputElement>('#practice-search')?.value).toBe('');
    expect(harness.asked.name).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Searching
  // ---------------------------------------------------------------------------

  it('sends the name to the server rather than filtering the page it has', async () => {
    const harness = await openList();

    await harness.go('/?name=care');

    // Filtering here would search the twenty-five rows on screen and report "no
    // matches" for a practice sitting on page three.
    expect(harness.asked).toEqual({ name: 'care', page: '0', size: '100' });
  });

  it.skip('waits for the typing to stop before asking', async () => {
    const harness = await openList();

    await harness.type('c');
    await harness.type('ca');
    await harness.type('car');
    await harness.type('care');

    // Nothing yet. Without the delay this is four requests and four entries in the
    // browser's history, three of each being something nobody asked for.
    harness.http.expectNone(() => true);

    await vi.advanceTimersByTimeAsync(400);
    await harness.settle();

    expect(harness.asked.name).toBe('care');
  });

  it.skip('asks immediately when the search is submitted', async () => {
    const harness = await openList();

    await harness.type('care');
    harness
      .query<HTMLFormElement>('.search')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.settle();

    expect(harness.asked.name).toBe('care');
  });

  it.skip('goes back to the first page when a search narrows the list', async () => {
    const harness = await openList({ answer: page(many(60), { totalElements: 60 }) });

    await harness.press('Next');
    await harness.search('care');

    // Searching from page two and keeping the page number asks for the second page
    // of a result that may have one - a search that found six and showed none.
    expect(harness.asked).toEqual({ name: 'care', page: '0', size: '100' });
  });

  it.skip('sends no name at all when the box is cleared', async () => {
    const harness = await openList();

    await harness.search('care');
    await harness.answer(page([NILE]));
    await harness.press('Clear the search');

    // `null`, not `''`: clearing the box makes the same request as never having
    // typed in it.
    expect(harness.asked.name).toBeNull();
  });

  it.skip('counts what matched against what there is, inside the field', async () => {
    const harness = await openList({ answer: page([NILE, DELTA, CAIRO]) });

    expect(harness.query('.band__matched')?.textContent?.trim()).toBe('3 practices');

    await harness.search('care');
    await harness.answer(page([NILE], { totalElements: 1, totalPages: 1 }));

    // The denominator is the last unfiltered total this screen saw. §6.2 says the
    // response does not carry it, so this remembers rather than inventing one.
    expect(harness.query('.band__matched')?.textContent?.trim()).toBe('1 of 3 practices');
  });

  it.skip('claims no denominator it has not been given', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', title: 'Practices', component: PracticeList }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiBaseUrl('https://api.test.invalid'),
        { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
      ],
    });

    // Opened straight at a search, so no unfiltered page has ever been seen.
    await TestBed.inject(Router).navigateByUrl('/?name=care');

    const fixture = TestBed.createComponent(PracticeList);
    const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

    await harness.settle();
    await harness.answer(page([NILE], { totalElements: 1, totalPages: 1 }));

    expect(harness.query('.band__matched')?.textContent?.trim()).toBe('1 practice');
  });

  it.skip('teaches the match only while the box is empty and focused', async () => {
    const harness = await openList();

    expect(harness.query('.search__hint')).toBeNull();

    await harness.focusSearch();

    expect(harness.query('.search__hint')?.textContent).toContain('Part of a name is enough');

    await harness.type('care');

    // Gone the moment there is something to read instead.
    expect(harness.query('.search__hint')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Saying what it found, and how
  // ---------------------------------------------------------------------------

  it('marks the run of each name the search matched', async () => {
    const harness = await openList();

    await harness.go('/?name=care');
    await harness.answer(
      page([NILE, { ...DELTA, name: 'Carewell Clinics' }], { totalElements: 2, totalPages: 1 }),
    );

    // Two rows answering "care" for two different reasons - one ends with it, one
    // begins with it. Marking the run is the screen doing once what the reader would
    // otherwise do twenty-five times.
    expect(harness.marked).toEqual(['Care', 'Care']);

    // The practice's own capitalisation, never the search's - and the name is still
    // one string, not the pieces it was drawn in.
    expect(harness.names).toEqual(['Nile Care', 'Carewell Clinics']);
  });

  it('marks every run in a name, not only the first', async () => {
    const harness = await openList();

    await harness.go('/?name=a');
    await harness.answer(page([{ ...NILE, name: 'Al Salam Care' }], { totalElements: 1 }));

    expect(harness.marked).toEqual(['A', 'a', 'a', 'a']);
    expect(harness.names).toEqual(['Al Salam Care']);
  });

  it('marks nothing when nothing is being searched for', async () => {
    const harness = await openList();

    expect(harness.marked).toEqual([]);
    expect(harness.names).toEqual(['Nile Care', 'Delta Physio']);
  });

  it.skip('shows a call is in flight on the field that started it', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // A search navigates to no new screen: the heading stays put and the rows are
    // replaced in place, so without this the only sign of work is the board going
    // faintly quiet - which reads as a screen that has stopped.
    expect(harness.query('.search__progress')).not.toBeNull();

    await harness.answer(page([NILE]));

    expect(harness.query('.search__progress')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // The searches already run
  // ---------------------------------------------------------------------------

  it.skip('offers the searches already run, under an empty box', async () => {
    const harness = await openList();

    expect(harness.recent).toEqual([]);

    await harness.search('delta');
    await harness.answer(page([DELTA], { totalElements: 1, totalPages: 1 }));

    // Not while there is something in the box: a reader who is typing has an answer
    // coming, and a panel between them and it is in the way.
    expect(harness.recent).toEqual([]);

    // Clearing the search gives the box back with focus in it, which is precisely
    // the moment there is nothing to show and something to offer.
    await harness.press('Clear the search');
    await harness.answer(page([NILE, DELTA]));

    expect(harness.recent).toEqual(['delta']);
  });

  it.skip('runs a remembered search when it is picked, and keeps the box', async () => {
    const harness = await openList();

    await harness.search('delta');
    await harness.answer(page([DELTA], { totalElements: 1, totalPages: 1 }));
    await harness.press('Clear the search');
    await harness.answer(page([NILE, DELTA]));

    await harness.focusSearch();
    harness.query<HTMLButtonElement>('.search__recent-item')!.click();
    await harness.settle();

    // The address, because the URL is the state - and immediately, because the term
    // was not typed and there is no typing to wait for the end of.
    expect(harness.url).toBe('/?name=delta');
    expect(harness.query<HTMLInputElement>('#practice-search')?.value).toBe('delta');
    expect(document.activeElement).toBe(harness.query('#practice-search'));
  });

  it.skip('drops a remembered search the next one was typed on top of', async () => {
    const harness = await openList();

    // The field asks 300ms after the last keystroke, so a reader who pauses mid-word
    // runs two searches. A list that kept both fills with the halves of one word.
    await harness.search('del');
    await harness.answer(page([DELTA], { totalElements: 1, totalPages: 1 }));
    await harness.search('delta');
    await harness.answer(page([DELTA], { totalElements: 1, totalPages: 1 }));
    await harness.press('Clear the search');
    await harness.answer(page([NILE, DELTA]));

    await harness.focusSearch();

    expect(harness.recent).toEqual(['delta']);
  });

  it.skip('names what was searched and offers one control to clear it', async () => {
    const harness = await openList({ answer: page([NILE, DELTA, CAIRO]) });

    await harness.search('zzz');
    await harness.answer(page([]));

    // It never says "Nothing here": the reader typed something, and the screen owes
    // them the thing they typed back.
    expect(harness.text).toContain('No practice matches “zzz”');
    expect(harness.text).toContain('to see all 3 practices');
    expect(harness.text).not.toContain('No practices yet');
  });

  it('points a fresh platform at the one thing there is to do', async () => {
    const harness = await openList({ answer: page([]) });

    expect(harness.text).toContain('No practices yet');
    expect(harness.text).toContain('Adding a practice creates it along with its branches');
    expect(harness.query('.empty__tile')).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Refining by what the route does not take
  // ---------------------------------------------------------------------------

  it('reads every page before it filters, never the page it is holding', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // THE WHOLE ARGUMENT OF THIS FEATURE IS IN THIS ASSERTION. Design §6.1 refused
    // filter pills because a filter applied to the twenty-five rows on screen
    // answers about the page; the panel is honest only because the console reads
    // the list first, at the largest page the route allows.
    expect(harness.asked).toEqual({ name: null, page: '0', size: '100' });

    await harness.answerWhole([[NILE, DELTA], [CAIRO]]);

    // Three practices from two pages, all of them in front of the reader.
    expect(harness.names).toEqual(['Nile Care', 'Delta Physio', 'Cairo Heart Centre']);
  });

  it.skip('counts every option against the platform, with its own group lifted', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    // An answer before anything is pressed: a reader who only wanted to know how
    // many are suspended never has to filter at all.
    expect(await harness.counts('Status')).toEqual(['Active1', 'Suspended1', 'Closed1']);
    expect(await harness.counts('Plan')).toEqual(['Basic2', 'Standard1']);

    await harness.choose('Status', 'Suspended');

    // With `Suspended` chosen, `Active` still says what pressing it would give -
    // not zero, which is how many are on screen.
    expect(await harness.counts('Status')).toEqual(['Active1', 'Suspended1', 'Closed1']);
    expect(harness.summary('Status')).toBe('Suspended');
    expect(harness.names).toEqual(['Delta Physio']);
  });

  it.skip('does not read the list again when a criterion changes', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    await harness.choose('Status', 'Suspended');
    await harness.choose('Plan', 'Basic');

    // The server would answer the same thing: it filters by name and by nothing
    // else. Keyed on anything wider, every option pressed re-read the platform.
    harness.http.expectNone(() => true);
    expect(harness.names).toEqual(['Delta Physio']);
  });

  it.skip('puts every criterion in the address, so a filtered list is a link', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    await harness.choose('Status', 'Suspended');
    await harness.setDate('from', '2026-02-01');
    await harness.setDate('to', '2026-02-28');

    expect(harness.url).toBe('/?status=SUSPENDED&from=2026-02-01&to=2026-02-28');
    expect(harness.names).toEqual(['Delta Physio']);
  });

  it.skip('says what it is filtered by on the controls themselves, on arrival', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', title: 'Practices', component: PracticeList }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiBaseUrl('https://api.test.invalid'),
        { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
      ],
    });

    await TestBed.inject(Router).navigateByUrl('/?status=CLOSED');

    const fixture = TestBed.createComponent(PracticeList);
    const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

    await harness.settle();
    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    // A link pasted into a support thread says what it is filtered by on the face of
    // the control that filtered it - there is nothing to open and nothing to press
    // to find out what the short list in front of you means.
    expect(harness.summary('Status')).toBe('Closed');
    expect(harness.names).toEqual(['Cairo Heart Centre']);
  });

  it.skip('says what is applied twice over: on each control, and in one row', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);
    await harness.choose('Size', '2+ branches');
    await harness.choose('Status', 'Active');

    // Each menu says its own answer; the row under the band says all of them at
    // once, and is the only place each can be taken off without opening the control
    // that set it.
    expect(harness.summary('Status')).toBe('Active');
    expect(harness.summary('Size')).toBe('2+ branches');
    expect(harness.tags).toEqual(['Status Active', 'Branches 2+']);
  });

  it.skip('answers a question somebody arrives holding, in one press', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    // "Which practices need looking at" is a question, not a status plus a plan plus
    // a window, and nobody should have to spell it out every morning.
    expect(harness.views).toEqual(['Needs attention 1', 'New this month 0', 'Large accounts 1']);

    await harness.pressView('Needs attention');

    expect(harness.names).toEqual(['Delta Physio']);
    expect(harness.url).toBe('/?status=SUSPENDED');

    // Pressing the view you are on takes you back out of it.
    await harness.pressView('Needs attention');

    expect(harness.url).toBe('/');
    expect(harness.names).toEqual(['Nile Care', 'Delta Physio', 'Cairo Heart Centre']);
  });

  it.skip('keeps the search and the ordering when a view replaces the filters', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);
    await harness.sortByColumn('Staff');
    await harness.pressView('Needs attention');

    // A view is somewhere to jump to, not a reset: what the reader typed and what
    // they sorted by are theirs rather than the view's.
    expect(harness.url).toBe('/?status=SUSPENDED&by=staff&dir=desc');
  });

  it.skip('takes one criterion off from its tag and leaves the rest', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);
    await harness.choose('Status', 'Suspended');
    await harness.choose('Plan', 'Basic');

    harness.all('.applied__tag')[0].click();
    await harness.settle();

    // "Not that one, the other four still" is the operation somebody narrowing a
    // list performs, and a reset that clears everything cannot do it.
    expect(harness.tags).toEqual(['Plan Basic']);
    expect(harness.url).toBe('/?plan=Basic');
  });

  it('orders the whole list from the column heading, not the page it is on', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA], [CAIRO]]);
    await harness.sortByColumn('Staff');

    // Cairo is on the server's second page and has the most staff. A heading that
    // sorted the page would have put Nile at the top and called it the biggest -
    // which is why this could not be a column heading until the console held the
    // whole list.
    expect(harness.names).toEqual(['Cairo Heart Centre', 'Nile Care', 'Delta Physio']);
    expect(harness.url).toBe('/?by=staff&dir=desc');
    expect(harness.sortedColumn).toBe('Staff \u2193');

    // Second press turns it round; third puts it back the way the server sent it,
    // which is the only order that is the same on every page.
    await harness.sortByColumn('Staff');

    expect(harness.names).toEqual(['Delta Physio', 'Nile Care', 'Cairo Heart Centre']);

    await harness.sortByColumn('Staff');

    expect(harness.url).toBe('/');
    expect(harness.sortedColumn).toBe('');
  });

  it.skip('pages what matched, not what the server happened to send first', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA], [CAIRO]]);
    await harness.sortByColumn('Practice');

    // Three practices at a page size the test can reach: the pager is over the
    // matched set now, and the server has already sent all of it.
    expect(harness.query('.pager')).toBeNull();
    expect(harness.names).toEqual(['Cairo Heart Centre', 'Delta Physio', 'Nile Care']);

    await harness.choose('Status', 'Active');

    expect(harness.names).toEqual(['Nile Care']);
    expect(harness.query('.band__matched')?.textContent?.trim()).toBe('1 of 3 practices');
  });

  it.skip('says so when it counted only part of the platform', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // Twenty-five pages of a hundred: more than a sweep will read. The counts are
    // then counts of what was read, and saying so is the difference between a limit
    // and a lie.
    await harness.answerWhole(
      Array.from({ length: 20 }, () => [NILE]),
      25,
    );

    expect(harness.query('.band__note')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Counted over the first 20 practices. Search by name to narrow the rest.',
    );
  });

  it('never says the platform is empty when it is the filters that are', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', title: 'Practices', component: PracticeList }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiBaseUrl('https://api.test.invalid'),
        { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
      ],
    });

    // From an address rather than from the panel, because the panel cannot get
    // here: an option that would leave nothing is disabled on it, counted and
    // visible but not pressable. A stale link can still ask for this.
    await TestBed.inject(Router).navigateByUrl('/?status=ACTIVE&staff=25');

    const fixture = TestBed.createComponent(PracticeList);
    const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

    await harness.settle();
    await harness.answerWhole([[NILE, DELTA, CAIRO]]);

    // "No practices yet" under a panel filtering to the big ones is the same defect
    // as showing it after a search: it reports the platform as empty when what is
    // empty is the answer.
    expect(harness.text).toContain('No practice matches these filters.');
    expect(harness.text).not.toContain('No practices yet');

    await harness.press('Clear the filters');

    expect(harness.names).toEqual(['Nile Care', 'Delta Physio', 'Cairo Heart Centre']);
  });

  it.skip('narrows a filtered list by name rather than starting again', async () => {
    const harness = await openList({ answer: 'unanswered' });

    await harness.answerWhole([[NILE, DELTA, CAIRO]]);
    await harness.choose('Plan', 'Basic');

    await harness.search('cairo');
    await harness.answerWhole([[CAIRO]]);

    // A reader who has filtered and then types a name is narrowing that list, not
    // throwing it away - so the name goes to the server and the plan stays applied.
    expect(harness.url).toBe('/?name=cairo&plan=Basic');
    expect(harness.tags).toEqual(['Plan Basic']);
    expect(harness.names).toEqual(['Cairo Heart Centre']);
  });

  it.skip('goes back to the first page whenever a criterion changes', async () => {
    const harness = await openList({ answer: page(many(60), { totalElements: 60 }) });

    await harness.press('Next');
    expect(harness.url).toBe('/?page=1');

    await harness.choose('Status', 'Active');

    // Page four of an unfiltered platform is not a page of the active ones, and
    // keeping the number asks for a page past the end of a shorter list.
    expect(harness.url).toBe('/?status=ACTIVE');
  });

  // ---------------------------------------------------------------------------
  // The one action
  // ---------------------------------------------------------------------------

  it('offers "Add a practice" as a row of the board, and as a link', async () => {
    const harness = await openList();

    // A link can be opened in a new tab, copied, and reached with the browser's own
    // controls; a button that calls `navigate` cannot. The schema's noun - onboard,
    // organization - does not appear on this screen.
    const add = harness.query<HTMLAnchorElement>('.practice__add');

    expect(add?.getAttribute('href')).toBe('/onboard');
    expect(add?.textContent?.trim()).toBe('Add a practice');
  });

  it('puts the action above the first practice rather than in the header', async () => {
    const harness = await openList();

    // The control that makes a row is the first row. A filled control in the corner
    // of the header wore the same shape as the status badge on every row under it.
    const board = harness.query('.board')!;

    expect(board.querySelector('.practice__add')).not.toBeNull();
    expect(harness.query('.page-header .practice__add')).toBeNull();
    expect(
      board.querySelector('.practice__add')!.compareDocumentPosition(harness.all('.practice')[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the action on screen while the first answer is still coming', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // Without it the first practice lands a row lower than the first placeholder
    // did, which is the shift the skeleton exists to avoid - and it is the only
    // thing a reader can actually do while they wait.
    expect(harness.query('.board--waiting .practice__add')).not.toBeNull();
  });

  it('offers the action when a search matched nothing, which has no board', async () => {
    const harness = await openList();

    await harness.go('/?name=nile%20care');
    await harness.answer(page([], { totalElements: 0, totalPages: 0 }));

    // The one state where a reader has looked for a practice, been told it is not
    // on the platform, and would otherwise be offered no way to add it.
    const add = harness
      .all('.empty__link')
      .find((link) => (link.textContent ?? '').trim() === 'Add a practice');

    expect(add?.getAttribute('href')).toBe('/onboard');
  });

  // ---------------------------------------------------------------------------
  // Paging
  // ---------------------------------------------------------------------------

  it('offers no pager when everything fits on one page', async () => {
    const harness = await openList();

    expect(harness.query('.pager')).toBeNull();
  });

  it('pages what matched, without asking the server again', async () => {
    const harness = await openList({ answer: page(many(60), { totalElements: 60 }) });

    expect(harness.names).toHaveLength(50);

    await harness.press('Next');

    // THE CONSOLE PAGES, NOT THE SERVER. It is holding every practice that matched -
    // it had to, to filter and order them - so turning a page is a slice of what is
    // already here rather than a round trip.
    harness.http.expectNone(() => true);
    expect(harness.names).toHaveLength(10);
    expect(harness.url).toBe('/?page=1');
    expect(harness.query('.pager__position')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Page 2 of 2',
    );
  });

  it('cannot be paged backwards off the first page', async () => {
    const harness = await openList({ answer: page(many(60), { totalElements: 60 }) });

    const previousStep = harness
      .all('button')
      .find((button) => (button.textContent ?? '').trim() === 'Previous');

    expect((previousStep as HTMLButtonElement).disabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // While the answer is on its way
  // ---------------------------------------------------------------------------

  it('draws the board it is about to fill rather than a sentence on an empty canvas', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // The card, its head and its rows are all on screen before the answer is, so
    // nothing on the page moves when the answer replaces them. The grey sentence
    // this replaced meant every one of them arrived at once and shoved the footnote
    // and the pager down the screen as they did.
    expect(harness.all('.practice__waiting')).toHaveLength(8);
    expect(harness.query('.loading')).toBeNull();
  });

  it('names the columns that are coming while it waits', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // Those four things are what the answer will be arranged in whatever it turns
    // out to say, so they are said rather than drawn as four more bars.
    expect(
      harness.all('.board--waiting .board__column').map((name) => (name.textContent ?? '').trim()),
    ).toEqual(['Practice', 'Branches', 'Staff', 'Onboarded']);
  });

  it('says it is waiting, for a reader who cannot see it', async () => {
    const harness = await openList({ answer: 'unanswered' });

    expect(
      harness.all('[role="status"]').map((region) => (region.textContent ?? '').trim()),
    ).toContain('Loading practices…');

    // The placeholders themselves are not read out: there is nothing in them to
    // read, and a screen reader walking eight empty rows is worse than one that is
    // told the screen is busy.
    expect(harness.query('.board--waiting .board__rows')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the rows lit and turns a ring while the next answer is in flight', async () => {
    const harness = await openList();

    await harness.go('/?name=care');

    // The board used to drop to 55% opacity for this, which is the picture of a
    // screen that has stopped - and it dimmed the rows the reader was mid-sentence
    // in. The previous answer stays exactly as it was; the ring is what is new.
    expect(harness.names).toEqual(['Nile Care', 'Delta Physio']);
    expect(harness.query('.spinner')).not.toBeNull();
    expect(harness.query('.board')?.getAttribute('aria-busy')).toBe('true');
  });

  it('takes the ring away when the answer lands', async () => {
    const harness = await openList();

    await harness.go('/?name=care');
    await harness.answer(page([NILE], { totalElements: 1, totalPages: 1 }));

    expect(harness.query('.spinner')).toBeNull();
    expect(harness.query('.board')?.getAttribute('aria-busy')).toBeNull();
  });

  it('shows the placeholders and not the ring on the first paint', async () => {
    const harness = await openList({ answer: 'unanswered' });

    // Two things saying "waiting" on a screen with nothing else on it is one too
    // many, and the skeleton is the one that also says what is coming.
    expect(harness.query('.spinner')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // When the call fails
  // ---------------------------------------------------------------------------

  it('says the list could not be loaded rather than rendering an empty platform', async () => {
    const harness = await openList({ answer: 'failed' });

    // "There are no practices" and "we could not ask" are different facts, and
    // rendering the first for the second is how somebody adds a duplicate.
    expect(harness.text).toContain('could not be loaded');
    expect(harness.text).not.toContain('No practices yet');
    expect(harness.query('.board')).toBeNull();
  });

  it('announces the failure rather than leaving it to be noticed', async () => {
    const harness = await openList({ answer: 'failed' });

    expect(harness.query('.failed')?.getAttribute('role')).toBe('alert');
  });

  it('asks again when the retry is pressed', async () => {
    const harness = await openList({ answer: 'failed' });

    await harness.press('Try again');
    await harness.answer(page([NILE]));

    expect(harness.names).toEqual(['Nile Care']);
    expect(harness.query('.failed')).toBeNull();
  });

  it('shows no stale rows underneath a failure', async () => {
    const harness = await openList();

    await harness.go('/?name=care');
    await harness.fail();

    // Rows left on display under an error read as the result of the search that
    // just failed, which is the one reading that is certainly wrong.
    expect(harness.names).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Reading it without seeing it
  // ---------------------------------------------------------------------------

  it('announces the result of a search, which navigates to no new screen', async () => {
    const harness = await openList();

    await harness.go('/?name=care');
    await harness.answer(page([NILE], { totalElements: 1, totalPages: 1 }));

    expect(harness.query('[role="status"]')?.textContent?.trim()).toBe(
      '1 practice matching “care”.',
    );
  });

  it('says nothing while a call is in flight, so an answer is not re-read', async () => {
    const harness = await openList();

    await harness.go('/?name=care');

    expect(harness.query('[role="status"]')?.textContent?.trim()).toBe('');
  });
});

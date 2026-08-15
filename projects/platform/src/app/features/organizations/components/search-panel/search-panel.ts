import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import { applyView, asDay, Criteria, Facets, ViewFacet } from '../../data/practice-criteria';
import { FilterMenu } from '../filter-menu/filter-menu';

/**
 * How long the box waits after the last keystroke before asking.
 *
 * 300ms, which design §6.1 names. Typing "care" is four keystrokes; without this it
 * is four requests and four entries in the browser's history, three of each being
 * something nobody asked for.
 */
const SEARCH_DELAY = 300;

/**
 * The search panel: every criterion this console can answer, in one band.
 *
 * IT IS ALWAYS ON SCREEN, AND THAT IS THE POINT. It was a name field in a toolbar
 * with a `Refine` button beside it that opened everything else, and the button was
 * the worst thing on the screen: it put a click in front of every question except
 * one, it made the name a first-class criterion and the other six second-class ones,
 * and it hid what the list was currently narrowed by behind a control that had to be
 * pressed to find out. A band that is always there costs one row of the screen and
 * removes all three.
 *
 * ONE CONTROL LANGUAGE ACROSS THE ROW: the name field, three menus and two dates,
 * all the same height, the same 1px edge, the same accent when they are set. It
 * reads as one instrument rather than as a form somebody assembled.
 *
 * THE MENUS ARE NOT `<select>`s - see `FilterMenu`. The native control cannot hold
 * two statuses and cannot put `Suspended 2` beside an option, and the counts are the
 * best thing on this screen.
 *
 * THE DATES ARE A RANGE, NOT A NAMED WINDOW. "Last 90 days" cannot say "the second
 * quarter", and a support thread is always about a period somebody else has already
 * named. The views above still carry the common one - `New this month` - for the
 * reader who wants a press rather than two dates.
 *
 * WHAT IT DOES NOT OWN. The criteria are the address's, and this emits the ones it
 * would like; the name is debounced here because that is where the typing is, and
 * everything else emits at once. The screen turns either into a navigation.
 */
@Component({
  selector: 'app-search-panel',
  imports: [FilterMenu],
  templateUrl: './search-panel.html',
  styleUrl: './search-panel.scss',
})
export class SearchPanel {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly criteria = input.required<Criteria>();

  readonly facets = input<Facets | undefined>(undefined);

  /** How many practices the criteria keep, and out of how many there are. */
  readonly matched = input<number | undefined>(undefined);

  readonly total = input<number | undefined>(undefined);

  readonly readSoFar = input<number | undefined>(undefined);

  readonly isLoading = input(false);

  /** The searches this session has already run, offered under an empty box. */
  readonly recent = input<readonly string[]>([]);

  /** When the answer arrived, which is what the date fields treat as today. */
  readonly at = input<number | undefined>(undefined);

  readonly refined = output<Criteria>();

  /**
   * What the whole band leaves: `12 practices`, or `4 of 12` when it is narrowing.
   *
   * The denominator is the platform's total and not the name's - see
   * `Practices.totalUnfiltered` - and it is left off when it equals the numerator,
   * because a fraction whose two halves are the same figure says one thing twice.
   */
  protected readonly summary = computed(() => {
    const matched = this.matched();

    if (matched === undefined) {
      return '';
    }

    const total = this.total();

    // "1 of 3 practices", never "1 of 3 practice": the noun belongs to the figure it
    // is counting out of, which is the one that cannot be one.
    return total === undefined || total === matched
      ? `${matched} ${matched === 1 ? 'practice' : 'practices'}`
      : `${matched} of ${total} practices`;
  });

  // ---------------------------------------------------------------------------
  // The name
  // ---------------------------------------------------------------------------

  /**
   * What is in the search box.
   *
   * A `linkedSignal` on the criteria rather than a plain one: the box shows the
   * keystroke immediately and the address catches up 300ms later, but when the
   * criteria change for any other reason - the back button, a shared link, the clear
   * control - the box has to follow. A plain signal would leave it saying "care"
   * after Back had taken the search away.
   */
  protected readonly typed = linkedSignal(() => this.criteria().name);

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // A pending search after the screen has gone would navigate on behalf of a page
    // nobody is looking at.
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onSearch(event: Event): void {
    const typed = (event.target as HTMLInputElement).value;

    this.typed.set(typed);

    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.refined.emit({ ...this.criteria(), name: typed }),
      SEARCH_DELAY,
    );
  }

  /**
   * Enter, which asks now rather than waiting out the delay.
   *
   * It is a `form` so that Enter does something at all - a bare input in a div
   * swallows it - and the default is prevented because there is nothing to submit:
   * the address is what this screen changes.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    clearTimeout(this.timer);
    this.refined.emit({ ...this.criteria(), name: this.typed() });
  }

  /**
   * Empties the box and puts focus back in it.
   *
   * The clear control disappears when the box empties, so focus would fall to
   * `<body>` and a keyboard reader would be returned to the top of the page having
   * done nothing but clear a search.
   */
  protected clearSearch(): void {
    this.typed.set('');
    clearTimeout(this.timer);
    this.refined.emit({ ...this.criteria(), name: '' });
    this.box()?.focus();
  }

  protected applyRecent(term: string): void {
    this.typed.set(term);
    clearTimeout(this.timer);
    this.refined.emit({ ...this.criteria(), name: term });
    this.box()?.focus();
  }

  private box(): HTMLInputElement | null {
    return (this.host.nativeElement as HTMLElement).querySelector('#practice-search');
  }

  /** Whether anything inside the search - the box, or a term it is offering - has focus. */
  protected readonly isFocused = signal(false);

  protected readonly showsGuide = computed(() => this.isFocused() && this.typed() === '');

  protected onFocusOut(event: FocusEvent): void {
    const going = event.relatedTarget;
    const search = (this.host.nativeElement as HTMLElement).querySelector('.search');

    if (!(going instanceof Node) || search?.contains(going) !== true) {
      this.isFocused.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // The rest of the criteria
  // ---------------------------------------------------------------------------

  /** Today, as the date fields see it - the moment the answer arrived, not the clock. */
  protected readonly today = computed(() => {
    const at = this.at();

    return at === undefined ? '' : asDay(at);
  });

  /**
   * A range whose end is before its start.
   *
   * SAID RATHER THAN CORRECTED. Swapping them silently answers a question the reader
   * did not ask; leaving it to produce an empty list makes them hunt for a mistake
   * the screen could see. It says so, and the empty list underneath is then the
   * expected consequence rather than a puzzle.
   */
  protected readonly isBackwards = computed(() => {
    const { from, to } = this.criteria();

    return from !== '' && to !== '' && from > to;
  });

  protected setFrom(event: Event): void {
    this.refined.emit({ ...this.criteria(), from: (event.target as HTMLInputElement).value });
  }

  protected setTo(event: Event): void {
    this.refined.emit({ ...this.criteria(), to: (event.target as HTMLInputElement).value });
  }

  protected toggleStatus(value: string): void {
    const criteria = this.criteria();

    this.refined.emit({ ...criteria, statuses: toggled(criteria.statuses, value) });
  }

  protected togglePlan(value: string): void {
    const criteria = this.criteria();

    this.refined.emit({ ...criteria, plans: toggled(criteria.plans, value) });
  }

  /**
   * The size menu, which holds two ladders in one control.
   *
   * `branches:5` or `staff:25`, because "how big" is one question a reader asks and
   * two figures the response happens to carry - and two menus side by side for it
   * would take a quarter of the band to say something asked once a week.
   */
  protected setSize(value: string): void {
    const [group, step] = value.split(':');
    const criteria = this.criteria();

    this.refined.emit(
      group === 'branches'
        ? { ...criteria, branches: Number(step), staff: 0 }
        : { ...criteria, staff: Number(step), branches: 0 },
    );
  }

  protected readonly sizeOptions = computed(() => {
    const facets = this.facets();

    return [
      ...(facets?.branches ?? []).map((facet) => ({
        ...facet,
        value: `branches:${facet.value}`,
        label: `${facet.label} branches`,
      })),
      ...(facets?.staff ?? []).map((facet) => ({
        ...facet,
        value: `staff:${facet.value}`,
        label: `${facet.label} staff`,
      })),
    ];
  });

  protected clearStatuses(): void {
    this.refined.emit({ ...this.criteria(), statuses: [] });
  }

  protected clearPlans(): void {
    this.refined.emit({ ...this.criteria(), plans: [] });
  }

  protected clearSize(): void {
    this.refined.emit({ ...this.criteria(), branches: 0, staff: 0 });
  }

  protected setView(view: ViewFacet): void {
    this.refined.emit(
      applyView(
        { key: view.value, label: view.label, criteria: view.criteria },
        this.criteria(),
        view.isOn,
      ),
    );
  }
}

/** In, or out again. The order of what stays is the order it was chosen in. */
function toggled(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values.filter((kept) => kept !== value) : [...values, value];
}

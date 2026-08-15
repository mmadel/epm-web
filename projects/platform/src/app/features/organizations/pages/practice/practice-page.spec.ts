import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { Component, inject as injectFn } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import {
  BASE_PATH,
  PlatformClinicStatusEnum,
  PlatformOrganization,
  PlatformOrganizationStatusEnum,
  PlatformSubscriptionStatusEnum,
} from 'api-client';
import { API_BASE_URL, provideApiBaseUrl } from 'core';

import { PracticePage } from './practice-page';

/**
 * One practice's screen.
 *
 * THE TWO THINGS THIS SCREEN HAS THAT NOTHING ELSE DOES are the meters and the
 * branch list, and both are asserted against the awkward cases rather than the
 * happy one: a practice over the limit its plan allows, and a branch list longer
 * than the count above it - which `LLD-ORGANIZATION.md` §2.8 says is correct and
 * which reads exactly like a defect.
 */
const PRACTICE_ID = '0195e2a1-0000-0000-0000-000000000001';
const PRACTICE_URL = `https://api.test.invalid/api/v1/platform/organizations/${PRACTICE_ID}`;

const NILE: PlatformOrganization = {
  id: PRACTICE_ID,
  name: 'Nile Care',
  status: PlatformOrganizationStatusEnum.Active,
  createdAt: '2026-03-01T09:00:00Z',
  subscription: {
    plan: 'Standard',
    status: PlatformSubscriptionStatusEnum.Active,
    seatLimit: 20,
    seatsUsed: 6,
    branchLimit: 5,
    branchesUsed: 2,
  },
  clinics: [
    { id: 'clinic-1', name: 'Maadi', status: PlatformClinicStatusEnum.Active },
    { id: 'clinic-2', name: 'Nasr City', status: PlatformClinicStatusEnum.Active },
  ],
};

/**
 * A host with a real outlet in it.
 *
 * THE SCREEN IS RENDERED THROUGH THE ROUTER RATHER THAN INSTANTIATED. `:id` is a
 * path parameter, and a component created directly gets the ROOT `ActivatedRoute` -
 * which carries the query parameters but none of the path ones. Built that way,
 * every test here passed a request for `/organizations/` with no id on the end of
 * it, which is the defect the screen would have shipped with.
 */
@Component({
  selector: 'app-practice-page-spec-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class Host {}

class Harness {
  constructor(
    readonly fixture: ComponentFixture<Host>,
    readonly http: HttpTestingController,
  ) {}

  get element(): HTMLElement {
    return this.fixture.nativeElement as HTMLElement;
  }

  /** See the list's spec: several turns, because opening this screen navigated. */
  async settle(): Promise<void> {
    for (let turn = 0; turn < 4; turn += 1) {
      TestBed.tick();
      await Promise.resolve();
    }

    TestBed.tick();
  }

  get text(): string {
    return (this.element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  all(selector: string): readonly HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>(selector)];
  }

  query<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }

  private held: TestRequest | undefined;

  get pending(): TestRequest {
    this.held ??= this.http.expectOne((request) => request.url === PRACTICE_URL);

    return this.held;
  }

  async answer(body: PlatformOrganization): Promise<void> {
    this.pending.flush(body);
    this.held = undefined;
    await this.settle();
  }

  async fail(status: number): Promise<void> {
    this.pending.flush({ code: 'EPM-XXX-000' }, { status, statusText: 'Failed' });
    this.held = undefined;
    await this.settle();
  }

  /**
   * Each meter, as its label, its reading, how full its bar is drawn, and the note
   * under it.
   *
   * The reading is two elements - the figure used carries the weight and the limit
   * beside it is the scale - so this joins them rather than asserting on whatever
   * whitespace the two spans happen to sit with.
   */
  get meters(): readonly { label: string; reading: string; filled: string; note: string }[] {
    return this.all('.meter').map((meter) => ({
      label: (meter.querySelector('.meter__label')?.textContent ?? '').trim(),
      reading: [
        (meter.querySelector('.meter__used')?.textContent ?? '').trim(),
        (meter.querySelector('.meter__limit')?.textContent ?? '').trim(),
      ].join(' '),
      filled: meter.querySelector<HTMLElement>('.meter__fill')?.style.inlineSize ?? '',
      note: (meter.querySelector('.meter__note')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    }));
  }

  /**
   * Everything the screen says about the PRACTICE, and not what it says about
   * itself: the footnote under the panels contains the words "No patients, no named
   * staff" on purpose, and it is not part of what was rendered from the response.
   */
  get practiceText(): string {
    return [this.query('.hero'), ...this.all('.panel')]
      .map((part) => part?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  get branches(): readonly string[] {
    return this.all('.branch').map(
      (branch) => branch.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  }
}

async function openPractice(
  answer: PlatformOrganization | 'unanswered' = NILE,
  id = PRACTICE_ID,
): Promise<Harness> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'practices/:id', title: 'Practice', component: PracticePage }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
    ],
  });

  const fixture = TestBed.createComponent(Host);

  // Navigated to rather than instantiated, because the id this screen reads is a
  // route parameter - a fixture that set an input would prove nothing about the URL.
  await TestBed.inject(Router).navigateByUrl(`/practices/${id}`);

  const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

  await harness.settle();

  if (answer !== 'unanswered') {
    await harness.answer(answer);
  }

  return harness;
}

describe('PracticePage', () => {
  it('reads the practice named in the address', async () => {
    const harness = await openPractice('unanswered');

    expect(harness.pending.request.method).toBe('GET');
  });

  it('names the practice in the heading, because the route cannot', async () => {
    const harness = await openPractice();

    const heading = harness.query('h1');

    expect(heading?.textContent?.trim()).toBe('Nile Care');
    // The frame moves focus to `main h1` after every navigation, and the browser
    // refuses to focus an element that cannot take it.
    expect(heading?.getAttribute('tabindex')).toBe('-1');
  });

  it('says both statuses, because they are allowed to disagree', async () => {
    const harness = await openPractice({
      ...NILE,
      status: PlatformOrganizationStatusEnum.Active,
      subscription: { ...NILE.subscription, status: PlatformSubscriptionStatusEnum.PastDue },
    });

    // A practice can be ACTIVE with a PAST_DUE subscription. Somebody shown only one
    // of the two draws the wrong conclusion about why a customer is complaining.
    expect(harness.text).toContain('Active');
    expect(harness.text).toContain('Past due');
  });

  // ---------------------------------------------------------------------------
  // The meters - the figure the list could not show
  // ---------------------------------------------------------------------------

  it('draws a meter for each usage figure against its limit', async () => {
    const harness = await openPractice();

    // The note is the HEADROOM, not the usage said twice: "14 seats left" is the
    // number somebody weighing a plan change is actually reading.
    expect(harness.meters).toEqual([
      { label: 'Seats', reading: '6 of 20', filled: '30%', note: '14 seats left' },
      { label: 'Branches', reading: '2 of 5', filled: '40%', note: '3 branches left' },
    ]);
  });

  it('announces a meter as its reading rather than as a percentage', async () => {
    const harness = await openPractice();

    const seats = harness.query('.meter__track');

    expect(seats?.getAttribute('role')).toBe('meter');
    expect(seats?.getAttribute('aria-valuetext')).toBe('6 of 20');
    expect(seats?.getAttribute('aria-valuemax')).toBe('20');
  });

  it('says so in words when a practice is over what its plan allows', async () => {
    const harness = await openPractice({
      ...NILE,
      subscription: { ...NILE.subscription, seatsUsed: 24, seatLimit: 20 },
    });

    // The bar is full rather than overflowing its own track, and the words are what
    // carry it - a longer bar is not a reading.
    expect(harness.meters[0]).toEqual({
      label: 'Seats',
      reading: '24 of 20',
      filled: '100%',
      note: 'Over what this plan allows',
    });
  });

  it('draws no meter for a figure that did not arrive', async () => {
    const harness = await openPractice({
      ...NILE,
      subscription: { plan: 'Standard', status: PlatformSubscriptionStatusEnum.Active },
    });

    // A bar drawn at 0 of 20 for a figure nobody sent says the practice is empty.
    expect(harness.meters).toEqual([]);
    expect(harness.text).toContain('No usage figures came back');
  });

  // ---------------------------------------------------------------------------
  // The branches
  // ---------------------------------------------------------------------------

  it('lists every branch, active and inactive', async () => {
    const harness = await openPractice({
      ...NILE,
      clinics: [
        ...(NILE.clinics ?? []),
        { id: 'clinic-3', name: 'Zamalek', status: PlatformClinicStatusEnum.Inactive },
      ],
    });

    // The position is part of the row: a staff member's branches are positions in
    // this list on the way in, so the order is something the API acts on.
    expect(harness.branches).toEqual([
      '1 Maadi Active',
      '2 Nasr City Active',
      '3 Zamalek Inactive',
    ]);
  });

  it('explains why the branch count is smaller than the branch list', async () => {
    const harness = await openPractice({
      ...NILE,
      clinics: [
        ...(NILE.clinics ?? []),
        { id: 'clinic-3', name: 'Zamalek', status: PlatformClinicStatusEnum.Inactive },
      ],
    });

    // §2.8: the usage figures count active rows, the list carries every branch. So
    // "2 of 5" sits above a list of three, which reads exactly like a defect and is
    // not one - the screen says so rather than leaving it to be reported.
    expect(harness.text).toContain('counts active branches only');
    expect(harness.text).toContain('inactive one');
  });

  it('says nothing about the count when every branch is active', async () => {
    const harness = await openPractice();

    expect(harness.text).not.toContain('counts active branches only');
  });

  // ---------------------------------------------------------------------------
  // The boundary
  // ---------------------------------------------------------------------------

  it('names no person, on the most detailed screen in the console', async () => {
    const harness = await openPractice();

    // §2.8: no staff member appears in any form - no name, no email address, no
    // phone number, nothing clinical. This fails the moment somebody adds a call.
    for (const forbidden of ['@', 'patient', 'Patient', 'Staff member']) {
      expect(harness.practiceText).not.toContain(forbidden);
    }

    expect(harness.query('.boundary')).not.toBeNull();
  });

  it('offers no control that would change the practice', async () => {
    const harness = await openPractice();

    // The platform API is four operations and none of them writes to a practice, so
    // a control offering it would be a button with nothing behind it. The one button
    // on the screen copies the id to the clipboard, which is why the id is on screen
    // at all and which changes nothing about anything.
    const labels = harness.all('button').map((button) => (button.textContent ?? '').trim());

    expect(labels).toEqual(['Copy the practice id']);
    expect(labels.filter((label) => /suspend|delete|close|cancel|change/i.test(label))).toEqual([]);
  });

  it('copies the practice id, which is the reason it is on screen', async () => {
    const harness = await openPractice();
    const copied: string[] = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
    });

    harness.all('button')[0].click();
    await harness.settle();

    // Reading sixteen characters off a screen by eye is where the typo in the
    // support thread comes from.
    expect(copied).toEqual([PRACTICE_ID]);
    expect(harness.query('.hero__copied')?.textContent?.trim()).toBe('Copied');
  });

  it('shows the practice id, for the support thread it will be pasted into', async () => {
    const harness = await openPractice();

    // Not patient data and not a person - it is the fastest route to the log line,
    // which is the same argument design §4 makes for showing an error code here.
    expect(harness.query('.hero__id')?.textContent?.trim()).toBe(PRACTICE_ID);
  });

  it('leads to the form that would edit it', async () => {
    const harness = await openPractice();

    // Beside the practice's name, at the top of the screen - not at the foot of the
    // subscription panel, where it read as something the subscription does.
    expect(harness.query<HTMLAnchorElement>('.hero__action')?.getAttribute('href')).toBe(
      `/practices/${PRACTICE_ID}/edit`,
    );
  });

  it('offers the way back to the list', async () => {
    const harness = await openPractice();

    expect(harness.query<HTMLAnchorElement>('.back')?.getAttribute('href')).toBe('/practices');
  });

  // ---------------------------------------------------------------------------
  // When it cannot be read
  // ---------------------------------------------------------------------------

  it('says a practice is not there rather than offering a retry', async () => {
    const harness = await openPractice('unanswered');

    await harness.fail(404);

    // Nothing is gained by asking again for a practice that does not exist.
    expect(harness.text).toContain('There is no practice with that id');
    expect(harness.all('button')).toHaveLength(0);
  });

  it('tells a mistyped address from a missing practice', async () => {
    const harness = await openPractice('unanswered');

    // §2.8: a value that is not a UUID is 400, not 404 - the request was not
    // understood. That is a typo in the address, not a practice that is gone.
    await harness.fail(400);

    expect(harness.text).toContain('does not contain a practice id');
    expect(harness.text).not.toContain('There is no practice with that id');
  });

  it('offers a retry only for a failure worth retrying', async () => {
    const harness = await openPractice('unanswered');

    await harness.fail(503);

    expect(harness.text).toContain('could not be loaded');

    harness.query<HTMLButtonElement>('.failed__retry')!.click();
    await harness.settle();
    await harness.answer(NILE);

    expect(harness.query('h1')?.textContent?.trim()).toBe('Nile Care');
  });

  it('shows nothing of the practice while one is on its way', async () => {
    const harness = await openPractice('unanswered');

    // Not the previous practice's branches: a blank screen cannot be misread as an
    // answer, and last practice's figures under this one's name can.
    expect(harness.text).toContain('Loading the practice');
    expect(harness.query('h1')).toBeNull();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject as injectFn } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import {
  BASE_PATH,
  ListedPlan,
  PlatformOrganization,
  PlatformOrganizationStatusEnum,
  PlatformSubscriptionStatusEnum,
} from 'api-client';
import { API_BASE_URL, provideApiBaseUrl } from 'core';

import { PracticeEdit } from './practice-edit';

/**
 * The form that would edit a practice.
 *
 * THE FIRST TEST IS THE ONE THAT MATTERS. The platform API has four operations and
 * every one of them is a read except the one that creates a practice, so this
 * screen cannot save - and the defect it must never ship is a control that looks
 * like it did. A platform administrator who believes they have suspended a practice
 * has been told something untrue about a real customer.
 *
 * Everything else here is the form itself, which is real: it reads the practice,
 * fills itself in, validates, and knows what has changed. When the route lands,
 * those tests keep passing and one more gets written.
 */
const PRACTICE_ID = '0195e2a1-0000-0000-0000-000000000001';
const PRACTICE_URL = `https://api.test.invalid/api/v1/platform/organizations/${PRACTICE_ID}`;
const PLANS_URL = 'https://api.test.invalid/api/v1/platform/plans';

const PLANS: readonly ListedPlan[] = [
  { plan: 'Basic', seatLimit: 5, branchLimit: 1 },
  { plan: 'Standard', seatLimit: 20, branchLimit: 5 },
  { plan: 'Pro', seatLimit: 100, branchLimit: 25 },
];

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
  },
  clinics: [],
};

@Component({
  selector: 'app-practice-edit-spec-host',
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

  get submit(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('.form__submit')!;
  }

  async type(value: string): Promise<void> {
    const field = this.query<HTMLInputElement>('#practice-name')!;

    field.value = value;
    field.dispatchEvent(new Event('input'));
    await this.settle();
  }

  async choose(label: string): Promise<void> {
    const option = this.all('.choice__option').find((chip) =>
      (chip.textContent ?? '').trim().startsWith(label),
    );

    option?.querySelector<HTMLInputElement>('input')?.click();
    await this.settle();
  }
}

async function openEdit(practice: PlatformOrganization | 'failed' = NILE): Promise<Harness> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'practices/:id/edit', title: 'Edit practice', component: PracticeEdit },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
    ],
  });

  const fixture = TestBed.createComponent(Host);

  await TestBed.inject(Router).navigateByUrl(`/practices/${PRACTICE_ID}/edit`);

  const harness = new Harness(fixture, TestBed.inject(HttpTestingController));

  await harness.settle();

  const practiceRequest = harness.http.expectOne(PRACTICE_URL);

  if (practice === 'failed') {
    practiceRequest.flush({ code: 'EPM-XXX-000' }, { status: 503, statusText: 'Failed' });
  } else {
    practiceRequest.flush(practice);
  }

  await harness.settle();

  // The plan select reads `listPlans`, the same way the onboarding screen does.
  for (const plans of harness.http.match(PLANS_URL)) {
    plans.flush(PLANS);
  }

  await harness.settle();

  return harness;
}

describe('PracticeEdit', () => {
  // ---------------------------------------------------------------------------
  // The thing it must never do
  // ---------------------------------------------------------------------------

  it('cannot be submitted, because nothing is wired to receive it', async () => {
    const harness = await openEdit();

    // A control that looked like it saved would tell a platform administrator they
    // had changed a real customer's record when they had not. The routes exist as
    // of the 0.2.0 specification; this screen does not call them.
    expect(harness.submit.disabled).toBe(true);
  });

  it('stays unsubmittable after a valid change', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.choose('Suspended');

    // Valid, changed, and still not saveable. This is the test that fails the day
    // somebody enables the button without wiring a route behind it.
    expect(harness.text).toContain('This would be ready to save');
    expect(harness.submit.disabled).toBe(true);
  });

  it('says why before the form rather than after a press', async () => {
    const harness = await openEdit();

    const notice = harness.query('.notice');

    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('Saving is not available yet');
    // The route the button will call, named, so the reader can put it in a ticket.
    expect(harness.query('.notice__route')?.textContent).toContain(
      `PATCH /api/v1/platform/organizations/${PRACTICE_ID}`,
    );
  });

  it('sends nothing at all', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    harness
      .query<HTMLFormElement>('.form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.settle();

    // Not a failed request - no request. Submitting is prevented outright.
    harness.http.expectNone(() => true);
  });

  // ---------------------------------------------------------------------------
  // The form, which is real
  // ---------------------------------------------------------------------------

  it('fills itself in from the practice it read', async () => {
    const harness = await openEdit();

    expect(harness.query<HTMLInputElement>('#practice-name')?.value).toBe('Nile Care');
    expect(harness.query<HTMLSelectElement>('#practice-plan')?.value).toBe('Standard');

    const chosen = harness
      .all('.choice__option--on')
      .map((chip) => (chip.textContent ?? '').trim());

    expect(chosen).toEqual(['Active']);
  });

  it('offers the plans the server publishes, never a list of its own', async () => {
    const harness = await openEdit();

    // A select that quietly offered plans nobody published is how a practice ends up
    // on a plan that does not exist.
    const offered = harness
      .all('#practice-plan option')
      .map((option) => option.textContent?.trim());

    expect(offered).toEqual(['Basic', 'Standard', 'Pro']);
  });

  it('knows when nothing has changed', async () => {
    const harness = await openEdit();

    expect(harness.text).toContain('Nothing changed yet');
    expect(harness.query<HTMLButtonElement>('.form__revert')?.disabled).toBe(true);
  });

  it('does not count a trailing space as a change', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care  ');

    expect(harness.text).toContain('Nothing changed yet');
  });

  it('refuses to call an empty name valid', async () => {
    const harness = await openEdit();

    await harness.type('   ');

    expect(harness.text).toContain('Give the practice a name');
    expect(harness.text).toContain('Changed, but not valid yet');
  });

  it('puts every field back when the change is undone', async () => {
    const harness = await openEdit();

    await harness.type('Something else');
    await harness.choose('Closed');

    harness.query<HTMLButtonElement>('.form__revert')!.click();
    await harness.settle();

    expect(harness.query<HTMLInputElement>('#practice-name')?.value).toBe('Nile Care');
    expect(
      harness.all('.choice__option--on').map((chip) => (chip.textContent ?? '').trim()),
    ).toEqual(['Active']);
    expect(harness.text).toContain('Nothing changed yet');
  });

  it('offers no form at all when the practice could not be read', async () => {
    const harness = await openEdit('failed');

    expect(harness.text).toContain('could not be loaded');
    expect(harness.query('.form')).toBeNull();
  });

  it('offers the way back to the practice', async () => {
    const harness = await openEdit();

    expect(harness.query<HTMLAnchorElement>('.back')?.getAttribute('href')).toBe(
      `/practices/${PRACTICE_ID}`,
    );
  });
});

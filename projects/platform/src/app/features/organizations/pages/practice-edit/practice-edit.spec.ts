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
  ListedPlan,
  PlatformOrganization,
  PlatformOrganizationStatusEnum,
  PlatformSubscriptionStatusEnum,
} from 'api-client';
import { API_BASE_URL, provideApiBaseUrl } from 'core';

import { PracticeEdit } from './practice-edit';

/**
 * The form that edits a practice.
 *
 * THE FIRST GROUP IS THE ONE THAT MATTERS, and it did not stop mattering when the
 * route arrived. This form shows three fields and the platform API covers one of
 * them: the PATCH takes `name`, a status moves through three routes this screen does
 * not call, and nothing anywhere changes a plan. So the tests that guard the save
 * guard two things - that the name really is sent, and that a change this screen
 * cannot make never travels as though it could. A platform administrator who
 * believes they have suspended a practice has been told something untrue about a
 * real customer, and a save that dropped the status half of the form would tell them
 * exactly that while the button worked.
 *
 * Everything after it is the form itself: it reads the practice, fills itself in,
 * validates, and knows what has changed.
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

  /**
   * Submits the form itself rather than clicking the button.
   *
   * Deliberately the harder path: a disabled button cannot be clicked, so clicking
   * it would make every "it refuses to send" test pass for the wrong reason. The
   * form's submit event reaches the handler whatever the button looks like, which
   * is also how a reader pressing Enter in the name field gets there.
   */
  async press(): Promise<void> {
    this.query<HTMLFormElement>('.form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await this.settle();
  }

  /** The one PATCH the save makes, and a failure naming the method if there is none. */
  patch(): TestRequest {
    return this.http.expectOne(
      (request) => request.method === 'PATCH' && request.url === PRACTICE_URL,
    );
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
  // The save, and the things it must never do
  // ---------------------------------------------------------------------------

  it('saves the name, and sends the name alone', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    expect(harness.submit.disabled).toBe(false);

    await harness.press();

    const saved = harness.patch();

    // THE WHOLE BODY, not a property of it. `status` on this route is 422
    // EPM-ORG-007 whatever its value and the generated request type carries the
    // member anyway, so the assertion is that nothing else is there at all.
    expect(saved.request.body).toEqual({ name: 'Nile Care Group' });

    saved.flush({ ...NILE, name: 'Nile Care Group' });
    await harness.settle();

    expect(harness.text).toContain('Saved. This practice is now called Nile Care Group');
  });

  it('will not save while a field it has no route for has changed', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.choose('Suspended');

    // Valid, changed, and refused - because sending this would change the name and
    // leave the status alone while reporting success. The status has three routes
    // of its own and this screen calls none of them.
    expect(harness.submit.disabled).toBe(true);
    expect(harness.text).toContain('not everything here can be saved');

    await harness.press();
    harness.http.expectNone(() => true);
  });

  it('offers the way out of that block without undoing the name', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.choose('Suspended');

    harness.all('.note button').at(0)?.click();
    await harness.settle();

    // The status is back, the name the reader came here to change is not.
    expect(harness.query<HTMLInputElement>('#practice-name')?.value).toBe('Nile Care Group');
    expect(
      harness.all('.choice__option--on').map((chip) => (chip.textContent ?? '').trim()),
    ).toEqual(['Active']);
    expect(harness.submit.disabled).toBe(false);
  });

  it('sends one request however many times the button is pressed', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.press();
    await harness.press();

    // One in flight, one press swallowed. A disabled button is a rendering; the
    // guard in PracticeUpdate is what makes this true.
    harness.patch().flush({ ...NILE, name: 'Nile Care Group' });
    await harness.settle();

    harness.http.expectNone(() => true);
  });

  it('never says saved when the server refused', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.press();

    harness
      .patch()
      .flush({ code: 'EPM-ORG-007', status: 422 }, { status: 422, statusText: 'Unprocessable' });
    await harness.settle();

    expect(harness.text).not.toContain('Saved.');
    expect(harness.text).toContain('this console asked for something the server does not allow');
    // Still on the form, with the edit still in it, so the reader can try again.
    expect(harness.query<HTMLInputElement>('#practice-name')?.value).toBe('Nile Care Group');
  });

  it('says nothing is known when the save never arrived', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.press();

    harness.patch().error(new ProgressEvent('failed'));
    await harness.settle();

    // Not a refusal - no answer. The one thing that can be said is that trying
    // again is safe, because this is a PATCH and there is no key to reuse.
    expect(harness.text).toContain('did not reach the server');
    expect(harness.text).toContain('sending it twice is safe');
  });

  it('says a practice that is gone is gone, rather than offering a retry', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.press();

    harness.patch().flush(null, { status: 404, statusText: 'Not Found' });
    await harness.settle();

    expect(harness.text).toContain('could not be found');
  });

  it('drops a finished save the moment the reader types again', async () => {
    const harness = await openEdit();

    await harness.type('Nile Care Group');
    await harness.press();
    harness.patch().flush({ ...NILE, name: 'Nile Care Group' });
    await harness.settle();

    await harness.type('Nile Care Group Ltd');

    // A message about the save that finished a moment ago, sitting above a field
    // that has changed since, describes a practice that is no longer on screen.
    expect(harness.text).not.toContain('Saved.');
  });

  it('says what it saves before the form rather than after a press', async () => {
    const harness = await openEdit();

    const notice = harness.query('.notice');

    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('This screen saves the name');
    // The route it calls, named, so the reader can put it in a ticket.
    expect(harness.query('.notice__route')?.textContent).toContain(
      `PATCH /api/v1/platform/organizations/${PRACTICE_ID}`,
    );
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

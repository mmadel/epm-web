import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { inject as injectFn } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BASE_PATH, ListedPlan } from 'api-client';
import { API_BASE_URL, provideApiBaseUrl } from 'core';

import { Onboarding } from '../../data/onboarding';
import { OrganizationDraft, StaffDraft } from '../../organization-draft';
import { OnboardPractice } from './onboard-practice';

/** Where the tests expect the two routes to be, base URL and all. */
export const PLANS_URL = 'https://api.test.invalid/api/v1/platform/plans';
export const ONBOARD_URL = 'https://api.test.invalid/api/v1/platform/organizations';

/** What `listPlans` answers with unless a test says otherwise. Ordered by seats, as §4 says. */
export const PLANS: readonly ListedPlan[] = [
  { plan: 'BASIC', seatLimit: 5, branchLimit: 1 },
  { plan: 'STANDARD', seatLimit: 20, branchLimit: 5 },
  { plan: 'PRO', seatLimit: 100, branchLimit: 25 },
];

/**
 * The screen, driven the way a person drives it.
 *
 * EVERY HELPER GOES THROUGH THE DOM - typing into inputs, pressing buttons - rather
 * than calling the component's methods. The criteria are about what the screen
 * does, and a test that reaches past the template proves the class works while the
 * form stays broken. It is also what makes criterion 7 meaningful: the branch a
 * staff member is ticked for is a checkbox somebody ticked, not an array somebody
 * passed in.
 *
 * The services are `providedIn: 'root'` and outlive a component, so each harness
 * starts by resetting the TestBed and ending any draft left over from the last one.
 */
export class OnboardingHarness {
  constructor(
    readonly fixture: ComponentFixture<OnboardPractice>,
    readonly http: HttpTestingController,
  ) {}

  get element(): HTMLElement {
    return this.fixture.nativeElement as HTMLElement;
  }

  /**
   * Renders whatever the last interaction changed, and runs the render hooks.
   *
   * NOT `whenStable()`, deliberately. In a zoneless application an in-flight
   * `HttpClient` request is a pending task, and `whenStable()` waits for the queue
   * to empty - so every test that deliberately leaves a request unanswered (which
   * is most of them here: that is what "while the call is in flight" means) would
   * hang until the runner's timeout. `TestBed.tick()` does the work that is
   * actually wanted: change detection plus the `afterNextRender` hooks the screen
   * moves focus in. The awaited microtask lets a settled promise - the response a
   * test has just flushed - reach the subscriber before the next render.
   */
  async settle(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  }

  // -------------------------------------------------------------------------
  // Reading the screen
  // -------------------------------------------------------------------------

  query<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }

  all(selector: string): readonly HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>(selector)];
  }

  /** The text of the whole screen, whitespace collapsed, for "does it say" assertions. */
  get text(): string {
    return (this.element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** The one button whose label starts with `label`. */
  button(label: string): HTMLButtonElement {
    const found = this.all('button').find((button) =>
      (button.textContent ?? '').trim().toLowerCase().startsWith(label.toLowerCase()),
    );

    if (found === undefined) {
      throw new Error(`No button labelled "${label}". Buttons: ${this.buttonLabels.join(' | ')}`);
    }

    return found as HTMLButtonElement;
  }

  private get buttonLabels(): readonly string[] {
    return this.all('button').map((button) => (button.textContent ?? '').trim().slice(0, 40));
  }

  // -------------------------------------------------------------------------
  // Driving it
  // -------------------------------------------------------------------------

  async press(label: string): Promise<void> {
    this.button(label).click();
    await this.settle();
  }

  async type(id: string, value: string): Promise<void> {
    const field = this.query<HTMLInputElement>(`#${id}`);

    if (field === null) {
      throw new Error(`No field #${id} on screen.`);
    }

    field.value = value;
    field.dispatchEvent(new Event('input'));
    await this.settle();
  }

  async choose(id: string, value: string): Promise<void> {
    const select = this.query<HTMLSelectElement>(`#${id}`);

    if (select === null) {
      throw new Error(`No select #${id} on screen.`);
    }

    select.value = value;
    select.dispatchEvent(new Event('change'));
    await this.settle();
  }

  /** Ticks a checkbox by the label it sits in - "Doctor", "Maadi". */
  async tick(label: string): Promise<void> {
    const box = this.all('label')
      .filter((element) => (element.textContent ?? '').trim() === label)
      .map((element) => element.querySelector<HTMLInputElement>('input[type="checkbox"]'))
      .find((input) => input !== null);

    if (box === undefined || box === null) {
      throw new Error(`No checkbox labelled "${label}".`);
    }

    box.click();
    await this.settle();
  }

  // -------------------------------------------------------------------------
  // The form, filled the way the screen fills it
  // -------------------------------------------------------------------------

  /** Answers the `listPlans` call the screen makes when it opens. */
  answerPlans(plans: readonly ListedPlan[] = PLANS): void {
    this.http.expectOne(PLANS_URL).flush(plans);
  }

  /** Fails it instead, for the "plans failed" state. */
  failPlans(): void {
    this.http
      .expectOne(PLANS_URL)
      .flush({ code: 'EPM-XXX-000' }, { status: 503, statusText: 'Service Unavailable' });
  }

  async fillPractice(name: string, plan: string): Promise<void> {
    await this.type('practice-name', name);
    await this.choose('practice-plan', plan);
  }

  /** Adds a branch through the add form, from whichever step is open. */
  async addBranch(name: string, phone = ''): Promise<void> {
    await this.openStep('Branches');
    await this.press('Add a branch');
    await this.type('branch-form-name', name);

    if (phone !== '') {
      await this.type('branch-form-phone', phone);
    }

    await this.press('Add branch');
  }

  /** Adds a staff member, ticking the roles and branches named. */
  async addStaff(member: {
    fullName: string;
    email: string;
    roles?: readonly string[];
    branches?: readonly string[];
    speciality?: string;
  }): Promise<void> {
    await this.openStep('Staff');
    await this.press('Add a staff member');
    await this.type('staff-form-name', member.fullName);
    await this.type('staff-form-email', member.email);

    if (member.speciality !== undefined) {
      await this.type('staff-form-speciality', member.speciality);
    }

    for (const role of member.roles ?? ['Doctor']) {
      await this.tick(role);
    }

    for (const branch of member.branches ?? []) {
      await this.tick(branch);
    }

    await this.press('Add staff member');
  }

  /**
   * Takes every role off the one staff member, on the draft itself.
   *
   * THE FORM CANNOT PRODUCE THIS STATE, deliberately - it refuses to save a person
   * with no role - so this reaches past it to build the row the page-level rule
   * exists for. It is the only place in these tests that touches a service rather
   * than the screen, and it is doing what a future edit path or a restored draft
   * could do: hand the page a row that has to be caught before it is sent.
   */
  async stripRoles(): Promise<void> {
    await this.rewriteStaff((member) => ({ ...member, roles: [] }));
  }

  /** The same, for the branches they work at. */
  async stripBranches(): Promise<void> {
    await this.rewriteStaff((member) => ({ ...member, branchKeys: [] }));
  }

  private async rewriteStaff(
    change: (member: StaffDraft) => Omit<StaffDraft, 'key'>,
  ): Promise<void> {
    const draft = TestBed.inject(OrganizationDraft);
    const member = draft.staff()[0];

    draft.setStaff(member.key, change(member));
    await this.settle();
  }

  /** Opens a step by its heading, which is how a reader gets back to one. */
  async openStep(title: string): Promise<void> {
    const heading = this.all('.step__toggle').find((toggle) =>
      (toggle.textContent ?? '').includes(title),
    );

    if (heading === undefined) {
      throw new Error(`No step headed "${title}".`);
    }

    heading.click();
    await this.settle();
  }

  /** Presses create, from wherever the reader is. */
  async create(): Promise<void> {
    await this.openStep('Review and create');
    await this.press('Create');
  }

  /** The row-position controls, for the branch reorder and removal cases. */
  async pressRowControl(label: string): Promise<void> {
    const found = this.all('button').find(
      (button) => (button.querySelector('.visually-hidden')?.textContent ?? '').trim() === label,
    );

    if (found === undefined) {
      throw new Error(`No row control "${label}".`);
    }

    found.click();
    await this.settle();
  }
}

/**
 * Opens the screen with the plans already answered, unless asked not to.
 *
 * `provideApiBaseUrl` and `BASE_PATH` are wired exactly as the application wires
 * them, so the URLs these tests assert on are the URLs the console really builds -
 * a test that stubbed the service would prove the component and not the request.
 */
export async function openOnboarding(options?: {
  plans?: readonly ListedPlan[] | 'unanswered' | 'failed';
}): Promise<OnboardingHarness> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', title: 'New practice', component: OnboardPractice }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => injectFn(API_BASE_URL) },
    ],
  });

  // The draft and the submission are root services, so they survive a component
  // being destroyed - which is the point of them, and a hazard between tests.
  TestBed.inject(OrganizationDraft).reset();
  TestBed.inject(Onboarding).startAnother();

  const fixture = TestBed.createComponent(OnboardPractice);
  const harness = new OnboardingHarness(fixture, TestBed.inject(HttpTestingController));

  await harness.settle();

  const plans = options?.plans ?? PLANS;

  if (plans === 'failed') {
    harness.failPlans();
    await harness.settle();
  } else if (plans !== 'unanswered') {
    harness.answerPlans(plans);
    await harness.settle();
  }

  return harness;
}

/** A whole valid practice: two branches, one person at both of them. */
export async function fillValidPractice(harness: OnboardingHarness): Promise<void> {
  await harness.fillPractice('Nile Care', 'STANDARD');
  await harness.addBranch('Maadi', '+20221234567');
  await harness.addBranch('Nasr City');
  await harness.addStaff({
    fullName: 'Hassan Ali',
    email: 'hassan@nilecare.eg',
    roles: ['Doctor', 'Org admin'],
    branches: ['Maadi', 'Nasr City'],
  });
}

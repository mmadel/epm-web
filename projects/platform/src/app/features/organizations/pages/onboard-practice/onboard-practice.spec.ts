import { TestRequest } from '@angular/common/http/testing';
import { OnboardOrganizationRequest } from 'api-client';

import {
  fillValidPractice,
  ONBOARD_URL,
  openOnboarding,
  OnboardingHarness,
} from './onboarding.fixture';

/**
 * The screen, from the outside: one request, the key that makes it safe to repeat,
 * and the rules that stop it being sent at all.
 *
 * CRITERION 7 IS THE ONE THAT MATTERS (§8). It is the first test here because it is
 * the defect `LLD-ORGANIZATION.md` calls the most likely to ship and the hardest to
 * see: the request succeeds, and the wrong people are assigned to the wrong branch.
 * Both it and criterion 8 assert on the REQUEST BODY rather than on the draft,
 * because positions are what the server acts on - a test that stopped at the keys
 * would pass while the wrong numbers went out.
 */

/** The body of the one request the screen sent, as it went on the wire. */
function sent(request: TestRequest): OnboardOrganizationRequest {
  return request.request.body as OnboardOrganizationRequest;
}

async function submitted(harness: OnboardingHarness): Promise<TestRequest> {
  await harness.create();

  return harness.http.expectOne(ONBOARD_URL);
}

const CREATED = {
  organizationId: 'org-1',
  subscriptionId: 'sub-1',
  clinics: [
    { name: 'Maadi', id: 'clinic-1' },
    { name: 'Nasr City', id: 'clinic-2' },
  ],
  staff: [{ email: 'hassan@nilecare.eg', id: 'staff-1' }],
};

describe('OnboardPractice', () => {
  // -------------------------------------------------------------------------
  // Criterion 7 and 8 - branches, removed and reordered
  // -------------------------------------------------------------------------

  it('sends the position of the branch a person is ticked for, not the position they were ticked at (criterion 7)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addBranch('Nasr City');
    await harness.addBranch('Zamalek');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi', 'Zamalek'],
    });

    // Row 1 goes. Zamalek was row 3 and is now row 2, so the one position this
    // person still has is 1. An implementation that stored [0, 2] and renumbered
    // nothing sends [2] - a branch that no longer exists - and one that renumbered
    // naively sends [1] for the wrong reason. This asserts the branch, not the maths.
    await harness.openStep('Branches');
    await harness.pressRowControl('Remove Maadi');

    const request = await submitted(harness);

    expect(sent(request).clinics.map((clinic) => clinic.name)).toEqual(['Nasr City', 'Zamalek']);
    expect(sent(request).staff[0].clinics).toEqual([1]);
  });

  it('keeps a person at the same branch when the rows are reordered (criterion 8)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addBranch('Nasr City');
    await harness.addBranch('Zamalek');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Zamalek'],
    });

    await harness.openStep('Branches');
    await harness.pressRowControl('Move Zamalek up');
    await harness.pressRowControl('Move Zamalek up');

    const request = await submitted(harness);

    expect(sent(request).clinics.map((clinic) => clinic.name)).toEqual([
      'Zamalek',
      'Maadi',
      'Nasr City',
    ]);
    // Position 0 now, because Zamalek is row 1 now. The person never moved.
    expect(sent(request).staff[0].clinics).toEqual([0]);
  });

  // -------------------------------------------------------------------------
  // Criteria 1 and 2 - one request, and nothing while it is in flight
  // -------------------------------------------------------------------------

  it('sends exactly one request, carrying an Idempotency-Key (criterion 1)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const request = await submitted(harness);

    expect(request.request.headers.get('Idempotency-Key')).toMatch(/\S/);
    // Positions, not ids - the branches do not exist yet (§4).
    expect(sent(request).staff[0].clinics).toEqual([0, 1]);
    harness.http.verify();
  });

  it('sends the roles as an array, whatever the generated type calls them', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const request = await submitted(harness);

    // The generated client types `roles` as a `Set`, which `JSON.stringify` renders
    // as `{}` - so this asserts what actually goes on the wire rather than what the
    // compiler was told. See `rolesAsSent` in data/onboard-request.ts.
    expect(JSON.parse(JSON.stringify(sent(request))).staff[0].roles).toEqual([
      'DOCTOR',
      'ORG_ADMIN',
    ]);
  });

  it('disables the create control while the call is in flight (criterion 2)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await harness.create();

    const request = harness.http.expectOne(ONBOARD_URL);

    expect(harness.button('Creating').disabled).toBe(true);

    request.flush(CREATED);
    await harness.settle();

    expect(harness.text).toContain('was created');
  });

  it('sends nothing a second time while the first call is still out (criterion 1)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await harness.create();

    harness.http.expectOne(ONBOARD_URL);

    // The button is disabled, but a disabled button is a rendering: this presses it
    // anyway, which is what a double click, an Enter key and a slow network all do.
    harness.button('Creating').click();
    await harness.settle();

    harness.http.expectNone(ONBOARD_URL);
  });

  // -------------------------------------------------------------------------
  // Criteria 3 and 4 - what a success looks like
  // -------------------------------------------------------------------------

  it('lists every id the server issued (criterion 3)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    (await submitted(harness)).flush(CREATED);
    await harness.settle();

    const shown = harness.text;

    expect(shown).toContain('org-1');
    expect(shown).toContain('sub-1');
    expect(shown).toContain('Maadi');
    expect(shown).toContain('clinic-1');
    expect(shown).toContain('Nasr City');
    expect(shown).toContain('clinic-2');
    expect(shown).toContain('hassan@nilecare.eg');
    expect(shown).toContain('staff-1');
    // The form is gone: a filled form beside a success panel invites a second press.
    expect(harness.query('#practice-name')).toBeNull();
  });

  it('treats a 200 exactly as it treats a 201 (criterion 4)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    // The same key seen again. Both are successes and the reader is told nothing
    // about which one they got: the practice they are looking at is theirs either way.
    (await submitted(harness)).flush(CREATED, { status: 200, statusText: 'OK' });
    await harness.settle();

    expect(harness.text).toContain('was created');
    expect(harness.text).not.toMatch(/already|again|warning/i);
  });

  // -------------------------------------------------------------------------
  // Criteria 5 and 6 - the key across a retry, and after a success
  // -------------------------------------------------------------------------

  it('retries with the same Idempotency-Key after a failure (criterion 5)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const first = await submitted(harness);
    const key = first.request.headers.get('Idempotency-Key');

    first.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await harness.settle();

    // Re-enabled, and the message says pressing it again is safe.
    expect(harness.button('Create').disabled).toBe(false);

    await harness.press('Create');

    const second = harness.http.expectOne(ONBOARD_URL);

    // THE SAME KEY. A new one here creates a second practice, with a second
    // subscription and a second set of staff, and nothing on screen would say so.
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
  });

  it('uses a different key for the next practice (criterion 6)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const first = await submitted(harness);
    const firstKey = first.request.headers.get('Idempotency-Key');

    first.flush(CREATED);
    await harness.settle();

    await harness.press('Create another practice');

    // The draft is empty again, so this is a second practice from scratch.
    expect(harness.query<HTMLInputElement>('#practice-name')?.value).toBe('');

    await fillValidPractice(harness);

    const second = await submitted(harness);

    expect(second.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
  });

  // -------------------------------------------------------------------------
  // Criteria 9 to 12 - what never reaches the server
  // -------------------------------------------------------------------------

  it('blocks submit and marks both rows when two branches share a name (criterion 9)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi'],
    });

    await harness.create();

    harness.http.expectNone(ONBOARD_URL);

    await harness.openStep('Branches');

    // BOTH rows, not the second: a reader shown one marked row has to find the
    // other themselves.
    expect(harness.all('.entry--faulted')).toHaveLength(2);
    expect(harness.text).toContain('Two branches cannot share a name');
  });

  it('blocks submit and marks both rows when two people share an email (criterion 10)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'same@nilecare.eg',
      branches: ['Maadi'],
    });
    await harness.addStaff({
      fullName: 'Mona Adel',
      email: 'same@nilecare.eg',
      branches: ['Maadi'],
    });

    await harness.create();

    harness.http.expectNone(ONBOARD_URL);

    await harness.openStep('Staff');

    expect(harness.all('.entry--faulted')).toHaveLength(2);
    expect(harness.text).toContain('Two people cannot share an email address');
  });

  it('will not let a person be saved with no role at all (criterion 11)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.openStep('Staff');
    await harness.press('Add a staff member');
    await harness.type('staff-form-name', 'Hassan Ali');
    await harness.type('staff-form-email', 'hassan@nilecare.eg');
    await harness.tick('Maadi');

    // The row form is the first of the two places this rule lives: a person with no
    // role cannot be put on the draft at all, so the request cannot be built from
    // one. The page-level rule below is the second, for a row that reached that
    // state some other way.
    expect(harness.button('Add staff member').disabled).toBe(true);

    harness.button('Add staff member').click();
    await harness.settle();

    expect(harness.text).not.toContain('Hassan Ali');
  });

  it('will not offer create while a person has no role (criterion 11)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi'],
    });

    // Straight onto the draft, because the row form will not produce this state -
    // which is the point of the test above. This is the row a future edit path or a
    // restored draft could hand the page, and nothing may send it.
    await harness.stripRoles();
    await harness.openStep('Review and create');

    expect(harness.all('button').map((button) => button.textContent?.trim())).not.toContain(
      'Create practice',
    );
    harness.http.expectNone(ONBOARD_URL);
    expect(harness.text).toContain('Every person needs a name, an email, a role and a branch');
  });

  it('will not let a person be saved with no branch at all (criterion 12)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.openStep('Staff');
    await harness.press('Add a staff member');
    await harness.type('staff-form-name', 'Hassan Ali');
    await harness.type('staff-form-email', 'hassan@nilecare.eg');
    await harness.tick('Doctor');

    expect(harness.button('Add staff member').disabled).toBe(true);
  });

  it('will not offer create while a person works at no branch (criterion 12)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi'],
    });

    await harness.stripBranches();
    await harness.openStep('Review and create');

    expect(harness.all('button').map((button) => button.textContent?.trim())).not.toContain(
      'Create practice',
    );
    harness.http.expectNone(ONBOARD_URL);
  });

  it('will not offer create at all until somebody is on the practice (§4: staff, at least one)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.openStep('Review and create');

    // Blocked one step earlier than the criterion asks: the review step is locked
    // while a step above it is unfinished, so there is no create control to press
    // and no request to prevent. T-30 allowed a practice with nobody in it; §4 does
    // not, and this is where that changed.
    expect(harness.all('button').map((button) => button.textContent?.trim())).not.toContain(
      'Create practice',
    );
    harness.http.expectNone(ONBOARD_URL);

    await harness.openStep('Staff');

    expect(harness.text).toContain('At least one person is needed');
  });

  // -------------------------------------------------------------------------
  // No answer at all
  // -------------------------------------------------------------------------

  it('re-enables create and keeps the key when the request never arrives', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const request = await submitted(harness);

    request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await harness.settle();

    expect(harness.button('Create').disabled).toBe(false);
    expect(harness.text).toContain('did not reach the server');
    // Nothing claims the practice exists, because nothing knows: the success panel
    // is what would claim it, and the form is still on screen instead.
    expect(harness.query('app-created-panel')).toBeNull();
    // Still on the review step, with the form behind it: the practice may or may
    // not exist, and the only screen that would claim it does is the panel above.
    expect(harness.query('.steps')).not.toBeNull();
  });

  it('says nothing about a HttpErrorResponse it cannot read as a problem', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);

    const request = await submitted(harness);

    // A proxy answering with HTML is not a coded refusal, and must not be shown as
    // one - nor may the body reach the screen.
    request.flush('<html>502 Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' });
    await harness.settle();

    expect(harness.text).toContain('did not reach the server');
    expect(harness.text).not.toContain('502');
    expect(harness.text).not.toContain('Bad Gateway');
  });
});

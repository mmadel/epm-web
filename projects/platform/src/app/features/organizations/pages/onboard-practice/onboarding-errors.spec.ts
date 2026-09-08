import { Problem } from 'api-client';

import {
  fillValidPractice,
  ONBOARD_URL,
  openOnboarding,
  OnboardingHarness,
} from './onboarding.fixture';

/**
 * One test per code in §4: what the reader is told, and where they are put.
 *
 * TWO RULES ARE CHECKED IN EVERY ONE OF THEM, because they are the two the ticket
 * says must never break: the sentence on screen is written in this console, never
 * taken from the response (criterion 16), and an unknown code renders a message
 * rather than a blank screen or raw JSON (criterion 15).
 *
 * The bodies below are RFC 9457 problems, with a `title` deliberately set to a
 * sentence a reader would find plausible - "Seat limit exceeded" reads like a
 * message. If any of it ever reaches the screen, these tests say so.
 */
function problem(code: string, extra: Record<string, unknown> = {}): Problem {
  return {
    type: `https://errors.epm/${code}`,
    title: 'A server-side summary that must never be rendered',
    status: 422,
    code,
    traceId: '0d3f8e7c-trace',
    ...extra,
  };
}

/** Submits a valid practice and answers with `body`. */
async function refusedWith(
  harness: OnboardingHarness,
  body: Problem,
  status = body.status,
): Promise<void> {
  await harness.create();
  harness.http.expectOne(ONBOARD_URL).flush(body, { status, statusText: 'Refused' });
  await harness.settle();
}

/** What the screen must never show, whatever the code was. */
function showsNothingFromTheBody(harness: OnboardingHarness): void {
  expect(harness.text).not.toContain('must never be rendered');
  expect(harness.text).not.toContain('0d3f8e7c-trace');
  expect(harness.text).not.toContain('https://errors.epm');
  expect(harness.text).not.toContain('{');
}

/** Where focus ended up, by id - the other half of §4's table. */
function focused(harness: OnboardingHarness): string {
  return harness.element.ownerDocument.activeElement?.id ?? '';
}

describe('OnboardPractice, refused', () => {
  // -------------------------------------------------------------------------
  // Criterion 13 - the seat limit
  // -------------------------------------------------------------------------

  it('names both numbers and offers both ways out for EPM-ORG-006 (criterion 13)', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-006', { limit: 5, requested: 7 }));

    const shown = harness.text;

    // Both numbers, because "you have reached your seat limit" leaves the reader
    // counting staff to work out how far over they are.
    expect(shown).toContain('5 staff members');
    expect(shown).toContain('needs 7');
    // The two options that exist. There is nothing to retry here.
    expect(shown).toContain('Remove someone');
    expect(shown).toContain('plan with more seats');
    showsNothingFromTheBody(harness);
  });

  it('puts the seat limit against the staff region rather than against a person', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-006', { limit: 5, requested: 7 }));

    // Nobody in particular is the person over the limit, and marking the last one
    // added would say they were.
    expect(harness.all('.entry--faulted')).toHaveLength(0);
    expect(harness.query('.region-fault')).not.toBeNull();
    expect(focused(harness)).toBe('step-panel-3');
  });

  it('re-enables create after a refusal', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-006', { limit: 5, requested: 7 }));
    await harness.openStep('Review and create');

    expect(harness.button('Create').disabled).toBe(false);
  });

  // -------------------------------------------------------------------------
  // T-112 - exactly one ORG_ADMIN, which is a fact about the array
  // -------------------------------------------------------------------------

  it('puts EPM-ORG-014 against the staff section rather than against a person', async () => {
    const harness = await openOnboarding();

    // A draft this console would send: one person, and they are the org admin. The
    // client checks the same rule before submitting, so reaching this refusal means
    // the server and this build disagree about it - which is exactly the case the
    // code has to be handled for, and the reason the check here is a hint and not
    // the rule.
    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-014', { field: 'staff' }));

    // The fault is the array, not a person: with nobody ticked there is no row to
    // mark, and with two ticked neither of them is the mistake.
    expect(harness.all('.entry--faulted')).toHaveLength(0);
    expect(harness.query('.region-fault')).not.toBeNull();
    expect(focused(harness)).toBe('step-panel-3');
    expect(harness.text).toContain('exactly one person with the Org admin role');
    showsNothingFromTheBody(harness);
  });

  // -------------------------------------------------------------------------
  // Criterion 14 - the speciality of the row the server named
  // -------------------------------------------------------------------------

  it('moves focus to the speciality of the staff row named by EPM-ORG-005 (criterion 14)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Mona Adel',
      email: 'mona@nilecare.eg',
      roles: ['Doctor', 'Org admin'],
      branches: ['Maadi'],
    });
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi'],
      speciality: 'NOPE',
    });

    await refusedWith(
      harness,
      problem('EPM-ORG-005', { email: 'hassan@nilecare.eg', specialtyCode: 'NOPE' }),
    );

    // The SECOND person's row, opened as a form, with focus on the one control the
    // code is about - not the first row, and not the step.
    expect(focused(harness)).toBe('staff-form-speciality');
    expect(harness.query<HTMLInputElement>('#staff-form-name')?.value).toBe('Hassan Ali');
    showsNothingFromTheBody(harness);
  });

  // -------------------------------------------------------------------------
  // Criterion 15 - a code this build has never heard of
  // -------------------------------------------------------------------------

  it('renders a generic message for an unknown code, and logs it (criterion 15)', async () => {
    const harness = await openOnboarding();
    const logged: unknown[] = [];
    const warn = console.warn;

    console.warn = (...args: unknown[]) => logged.push(args.join(' '));

    try {
      await fillValidPractice(harness);
      await refusedWith(harness, problem('EPM-ORG-999', { somethingNew: 'from a newer server' }));
    } finally {
      console.warn = warn;
    }

    expect(harness.text).toContain('Something went wrong and that did not go through');
    // Never the code, never the body - and never a blank screen either.
    expect(harness.text).not.toContain('EPM-ORG-999');
    expect(harness.text).not.toContain('from a newer server');
    showsNothingFromTheBody(harness);
    expect(logged.join(' ')).toContain('EPM-ORG-999');
  });

  // -------------------------------------------------------------------------
  // The rest of §4's table
  // -------------------------------------------------------------------------

  it('sends EPM-ORG-004 to the plan select', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-004'));

    expect(focused(harness)).toBe('practice-plan');
    expect(harness.text).toContain('not a plan on offer');
    showsNothingFromTheBody(harness);
  });

  it('marks the SECOND branch of a pair for EPM-ORG-002', async () => {
    const harness = await openOnboarding();

    // "Maadi" and "maadi". This client rejects two branches with the SAME name and
    // deliberately not two that differ only in case: it does not know how the server
    // compares them, and refusing something the server would have accepted is the
    // failure §10 warns about. So this pair reaches the server, which is exactly the
    // case `EPM-ORG-002` exists for - and the reason it is handled even though §4
    // says it should not get there.
    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addBranch('maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      roles: ['Doctor', 'Org admin'],
      branches: ['Maadi'],
    });

    // The server sees the rows in order and answers about the one that has to
    // change, which is the second - the first is the branch that will exist.
    await refusedWith(harness, problem('EPM-ORG-002', { name: 'maadi' }), 409);

    expect(focused(harness)).toBe('branch-form-name');
    expect(harness.query<HTMLInputElement>('#branch-form-name')?.value).toBe('maadi');
    expect(harness.text).toContain('Two branches cannot share a name');
  });

  it('sends EPM-REQ-002 to the roles of the person it names', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-REQ-002', { email: 'hassan@nilecare.eg' }), 400);

    expect(focused(harness)).toBe('staff-form-roles');
    expect(harness.text).toContain('not a role this system recognises');
  });

  it('sends EPM-ORG-001 to the branch list of the person it names', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    await refusedWith(harness, problem('EPM-ORG-001', { email: 'hassan@nilecare.eg' }), 400);

    expect(focused(harness)).toBe('staff-form-branches');
  });

  it('reports EPM-REQ-003 as the client defect it is, and still tells the reader', async () => {
    const harness = await openOnboarding();
    const logged: string[] = [];
    const error = console.error;

    console.error = (...args: unknown[]) => logged.push(args.join(' '));

    try {
      await fillValidPractice(harness);
      await refusedWith(harness, problem('EPM-REQ-003'), 400);
    } finally {
      console.error = error;
    }

    // §4: the message goes nowhere in particular - it is not the reader's mistake -
    // but silence after pressing a button is not an option either.
    expect(harness.text).toContain('could not be sent safely');
    expect(logged.join(' ')).toContain('Idempotency-Key');
    showsNothingFromTheBody(harness);
  });

  it('falls back to the region when the server names no row it can find', async () => {
    const harness = await openOnboarding();

    await fillValidPractice(harness);
    // No `email`, no `index`: this client cannot know which person is meant, and a
    // message beside the wrong one would be worse than one at the top of the step.
    await refusedWith(harness, problem('EPM-ORG-005'), 422);

    expect(focused(harness)).toBe('step-panel-3');
    expect(harness.all('.entry--faulted')).toHaveLength(0);
    expect(harness.text).toContain('not a speciality this system recognises');
  });
});

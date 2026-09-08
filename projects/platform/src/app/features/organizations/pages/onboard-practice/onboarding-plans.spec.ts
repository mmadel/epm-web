import { PLANS, PLANS_URL, openOnboarding } from './onboarding.fixture';

/**
 * The plan cards, and the two counters that follow from them - criteria 18 to 22.
 *
 * ONE THING RUNS THROUGH ALL OF THEM: no list of plans exists in this repository.
 * The cards, the seat limit and the branch limit all come from `listPlans`, so a
 * plan added to the server's table appears here on the next page load with no
 * frontend change - and a console that could not reach the route offers a retry
 * rather than a list of its own invention.
 *
 * The set was a `select` and is now a radio per card. Every test here asks what is
 * OFFERED and what choosing does, rather than which element offers it, because the
 * criteria are about the plans and not about the control.
 */
describe('OnboardPractice, plans', () => {
  // -------------------------------------------------------------------------
  // Criterion 18 - the options are the response
  // -------------------------------------------------------------------------

  it('builds the set from listPlans, in the order it answered (criterion 18)', async () => {
    const harness = await openOnboarding();

    expect(harness.optionsIn('practice-plan')).toEqual(['BASIC', 'STANDARD', 'PRO']);
  });

  it('states what each plan comes with, from the same response (criterion 18)', async () => {
    const harness = await openOnboarding();

    // The numbers are on the cards, so two plans can be compared before either is
    // chosen. They are `listPlans`' own, not this console's.
    expect(harness.text).toContain('5 seats · 1 branch');
    expect(harness.text).toContain('20 seats · 5 branches');
    expect(harness.text).toContain('100 seats · 25 branches');
  });

  it('says nothing about a limit the response did not send', async () => {
    const harness = await openOnboarding({ plans: [{ plan: 'STANDARD', seatLimit: 20 }] });

    // Every member of the generated type is optional. A missing limit is dropped
    // rather than rendered as a zero - "0 branches" is a number the server never
    // sent, on a plan somebody is about to choose. Read off the card rather than off
    // the page: the word "branches" is a step title two headings below.
    expect(harness.query('.plan__allowance')?.textContent?.trim()).toBe('20 seats');
  });

  it('shows a plan nobody wrote into this console (criterion 18)', async () => {
    // The case the criterion is really about: a plan added to the table after this
    // build shipped. Nothing here knows the word "ENTERPRISE".
    const harness = await openOnboarding({
      plans: [...PLANS, { plan: 'ENTERPRISE', seatLimit: 500, branchLimit: 120 }],
    });

    expect(harness.text).toContain('ENTERPRISE');

    await harness.fillPractice('Nile Care', 'ENTERPRISE');
    await harness.addBranch('Maadi');
    await harness.openStep('Staff');

    expect(harness.text).toContain('0 of 500 seats');
  });

  it('reads the route once when the screen opens', async () => {
    const harness = await openOnboarding();

    // Not per keystroke, and not per step: the plans do not change while a form is
    // being filled in, and a set that reloaded under the reader would be a set
    // whose chosen card could vanish mid-decision.
    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');

    harness.http.expectNone(PLANS_URL);
  });

  it('does not offer a plan the response could not name', async () => {
    const harness = await openOnboarding({
      plans: [{ plan: 'STANDARD', seatLimit: 20, branchLimit: 5 }, { seatLimit: 9 }],
    });

    // Every member of the generated type is optional, so this is a response the
    // compiler insists is possible. A card with no value would set the plan to
    // nothing, which is worse than not being offered.
    expect(harness.optionsIn('practice-plan')).toEqual(['STANDARD']);
  });

  // -------------------------------------------------------------------------
  // Criteria 19 and 20 - the counters, and a change of plan
  // -------------------------------------------------------------------------

  it('counts staff against the chosen plan the moment it is chosen (criterion 19)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({ fullName: 'A', email: 'a@nilecare.eg', branches: ['Maadi'] });
    await harness.addStaff({ fullName: 'B', email: 'b@nilecare.eg', branches: ['Maadi'] });
    await harness.addStaff({ fullName: 'C', email: 'c@nilecare.eg', branches: ['Maadi'] });

    // 20 comes from `listPlans`, not from this console.
    expect(harness.text).toContain('3 of 20 seats');
  });

  it('shows the counter before anything is over it, not only on failure (§5)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.openStep('Branches');

    expect(harness.text).toContain('0 of 5 branches');
  });

  it('re-evaluates both counters on a plan change, clearing nothing (criterion 20)', async () => {
    const harness = await openOnboarding();

    await harness.fillPractice('Nile Care', 'STANDARD');
    await harness.addBranch('Maadi');
    await harness.addStaff({
      fullName: 'Hassan Ali',
      email: 'hassan@nilecare.eg',
      branches: ['Maadi'],
    });

    expect(harness.text).toContain('1 of 20 seats');

    await harness.openStep('Practice');
    await harness.choose('practice-plan', 'BASIC');
    await harness.openStep('Staff');

    expect(harness.text).toContain('1 of 5 seats');
    // NOT A ROW WAS CLEARED. The counters are derived from the plan and the rows;
    // changing one recomputes them and touches neither.
    expect(harness.text).toContain('Hassan Ali');

    await harness.openStep('Branches');

    expect(harness.text).toContain('1 of 1 branches');
    expect(harness.text).toContain('Maadi');
  });

  // -------------------------------------------------------------------------
  // Criterion 21 - a counter warns and never blocks
  // -------------------------------------------------------------------------

  it('warns but still allows create when the staff count is over the seats (criterion 21)', async () => {
    const harness = await openOnboarding();

    // BASIC allows one branch and five seats. This has two branches and six people.
    await harness.fillPractice('Nile Care', 'BASIC');
    await harness.addBranch('Maadi');
    await harness.addBranch('Nasr City');

    // One of the six is the org admin, because a practice needs exactly one (T-112).
    // That rule is about the shape of the staff array and this test is about the seat
    // counter; satisfying it is what keeps the two apart.
    for (const at of [1, 2, 3, 4, 5, 6]) {
      await harness.addStaff({
        fullName: `Person ${at}`,
        email: `person-${at}@nilecare.eg`,
        roles: at === 1 ? ['Doctor', 'Org admin'] : ['Doctor'],
        branches: ['Maadi'],
      });
    }

    await harness.openStep('Staff');

    expect(harness.text).toContain('6 of 5 seats');
    expect(harness.query('.counter--over')).not.toBeNull();

    await harness.openStep('Branches');

    expect(harness.text).toContain('2 of 1 branches');

    // AND THE BUTTON STILL WORKS. The server owns the limit and answers
    // `EPM-ORG-006` if it disagrees; a console that refused here would be a form
    // nobody can send for a reason nobody can see (§5).
    await harness.create();

    expect(harness.http.expectOne(() => true).request.url).toContain('/organizations');
  });

  // -------------------------------------------------------------------------
  // Criterion 22 - when the route cannot be reached
  // -------------------------------------------------------------------------

  it('offers nothing and offers a retry when listPlans fails (criterion 22)', async () => {
    const harness = await openOnboarding({ plans: 'failed' });

    expect(harness.text).toContain('The plans could not be loaded');

    // NO LIST FROM NOWHERE. A fallback here would let somebody put a practice on a
    // plan that does not exist. With no card there is nothing to press, which is a
    // stronger statement than a disabled control: there is no plan on this screen.
    expect(harness.optionsIn('practice-plan')).toEqual([]);
    expect(harness.text).not.toContain('STANDARD');
  });

  it('asks again when the retry is pressed, and recovers (criterion 22)', async () => {
    const harness = await openOnboarding({ plans: 'failed' });

    await harness.press('Try again');
    harness.answerPlans();
    await harness.settle();

    expect(harness.optionsIn('practice-plan')).toEqual(['BASIC', 'STANDARD', 'PRO']);
    expect(harness.text).not.toContain('The plans could not be loaded');
  });

  it('offers no plan while the first call is still out, and says why', async () => {
    const harness = await openOnboarding({ plans: 'unanswered' });

    // An empty set and a set that has not arrived look identical, so it is said.
    expect(harness.optionsIn('practice-plan')).toEqual([]);
    expect(harness.text).toContain('Loading plans');

    harness.answerPlans();
    await harness.settle();

    expect(harness.optionsIn('practice-plan')).toEqual(['BASIC', 'STANDARD', 'PRO']);
    expect(harness.text).not.toContain('Loading plans');
  });
});

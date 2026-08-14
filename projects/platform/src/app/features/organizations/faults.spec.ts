import { TestBed } from '@angular/core/testing';

import { Fault, faultsIn } from './faults';
import { OrganizationDraft } from './organization-draft';

/**
 * The rules that decide whether anything is sent at all - criteria 9 to 12, at the
 * level they are written.
 *
 * They are asserted here as well as through the screen because the screen catches
 * most of them earlier: the row forms refuse to save a person with no role, and the
 * review step stays locked while any row is unfinished, so a reader never reaches
 * the create control with one. That layering is the right behaviour and it makes
 * these rules hard to observe from the outside - and a rule nobody can see is a rule
 * that quietly stops working. This is where each one is proved to still exist.
 */
function draftWith(shape: {
  name?: string;
  plan?: string;
  branches?: readonly { name: string }[];
  staff?: readonly {
    fullName?: string;
    email?: string;
    roles?: readonly string[];
    at?: readonly number[];
  }[];
}): OrganizationDraft {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  const draft = TestBed.inject(OrganizationDraft);

  draft.setName(shape.name ?? 'Nile Care');
  draft.setPlan(shape.plan ?? 'STANDARD');

  for (const branch of shape.branches ?? [{ name: 'Maadi' }]) {
    draft.setBranch(draft.addBranchEntry(), { name: branch.name, phone: '' });
  }

  const keys = draft.branches().map((branch) => branch.key);

  for (const member of shape.staff ?? [{}]) {
    draft.setStaff(draft.addStaffEntry(), {
      fullName: member.fullName ?? 'Hassan Ali',
      email: member.email ?? 'hassan@nilecare.eg',
      roles: member.roles ?? ['DOCTOR'],
      specialityCode: '',
      branchKeys: (member.at ?? [0]).map((at) => keys[at]),
    });
  }

  return draft;
}

/** The rows a fault names, so an assertion can say "both of them" and mean it. */
function rows(faults: readonly Fault[], match: Partial<Fault>): readonly string[] {
  return faults
    .filter((fault) =>
      Object.entries(match).every(([member, value]) => fault[member as keyof Fault] === value),
    )
    .map((fault) => fault.rowKey ?? '');
}

describe('faultsIn', () => {
  it('finds nothing wrong with a practice that is ready to send', () => {
    expect(faultsIn(draftWith({}))).toEqual([]);
  });

  it('reads top to bottom, so the first fault is the first one on screen', () => {
    const faults = faultsIn(draftWith({ name: '   ', plan: '', staff: [{ roles: [] }] }));

    // Focus goes to the first entry, and a list that reported the staff step before
    // the practice step would send a reader backwards up their own form.
    expect(faults.map((fault) => fault.region)).toEqual(['practice', 'practice', 'staff']);
    expect(faults[0].field).toBe('name');
  });

  it('wants a name and a plan on the practice', () => {
    expect(faultsIn(draftWith({ name: '  ' }))[0]).toMatchObject({
      region: 'practice',
      field: 'name',
    });
    expect(faultsIn(draftWith({ plan: '' }))[0]).toMatchObject({
      region: 'practice',
      field: 'plan',
    });
  });

  it('wants at least one branch, and every branch named', () => {
    expect(faultsIn(draftWith({ branches: [], staff: [{ at: [] }] }))).toMatchObject([
      { region: 'branches', message: 'Add at least one branch.' },
      { region: 'staff' },
    ]);

    expect(faultsIn(draftWith({ branches: [{ name: ' ' }] }))[0]).toMatchObject({
      region: 'branches',
      field: 'name',
    });
  });

  it('marks BOTH branch rows that share a name (criterion 9)', () => {
    const draft = draftWith({
      branches: [{ name: 'Maadi' }, { name: 'Maadi' }, { name: 'Nasr City' }],
    });

    const duplicates = rows(faultsIn(draft), { region: 'branches', field: 'name' });

    expect(duplicates).toHaveLength(2);
    expect(duplicates).toEqual(
      draft
        .branches()
        .slice(0, 2)
        .map((branch) => branch.key),
    );
  });

  it('marks BOTH staff rows that share an email (criterion 10)', () => {
    const draft = draftWith({
      staff: [{ email: 'same@nilecare.eg' }, { email: 'SAME@nilecare.eg' }],
    });

    // Case-insensitively, because two addresses differing only in case are one
    // mailbox, and the second person would never receive anything.
    expect(rows(faultsIn(draft), { region: 'staff', field: 'email' })).toHaveLength(2);
  });

  it('does not call two unnamed rows duplicates of each other', () => {
    const faults = faultsIn(draftWith({ branches: [{ name: '' }, { name: '' }] }));

    // Two messages for one mistake. They are unfilled rows, which the rule above
    // already reports.
    expect(faults.every((fault) => fault.message === 'Give this branch a name.')).toBe(true);
  });

  it('wants a role on every person (criterion 11)', () => {
    expect(faultsIn(draftWith({ staff: [{ roles: [] }] }))[0]).toMatchObject({
      region: 'staff',
      field: 'roles',
      message: 'Give this person at least one role.',
    });
  });

  it('wants a branch on every person (criterion 12)', () => {
    expect(faultsIn(draftWith({ staff: [{ at: [] }] }))[0]).toMatchObject({
      region: 'staff',
      field: 'branches',
    });
  });

  it('wants an email that could be delivered to', () => {
    expect(faultsIn(draftWith({ staff: [{ email: 'hassan' }] }))[0]).toMatchObject({
      region: 'staff',
      field: 'email',
    });
    expect(faultsIn(draftWith({ staff: [{ email: 'hassan@nilecare' }] }))[0]).toMatchObject({
      field: 'email',
    });
    expect(faultsIn(draftWith({ staff: [{ email: 'hassan@nile care.eg' }] }))[0]).toMatchObject({
      field: 'email',
    });
  });

  it('wants at least one person (§4: staff, at least one)', () => {
    expect(faultsIn(draftWith({ staff: [] }))).toMatchObject([
      { region: 'staff', message: 'Add at least one staff member.' },
    ]);
  });

  it('never blocks on a counter, whatever the plan allows', () => {
    // Nine people on a plan whose seat limit is five, if the plans said so. The
    // counters warn on screen and the server decides (§5, EPM-ORG-006); a client
    // that refused here would be a form nobody can send for a reason nobody can see.
    const draft = draftWith({
      staff: Array.from({ length: 9 }, (_, at) => ({ email: `person-${at}@nilecare.eg` })),
    });

    expect(faultsIn(draft)).toEqual([]);
  });
});

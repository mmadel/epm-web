import { TestBed } from '@angular/core/testing';

import { OrganizationDraft } from './organization-draft';

/**
 * Most of these are about ONE THING: a staff member's branches survive whatever
 * happens to the branch list.
 *
 * `LLD-ORGANIZATION.md` §2.1 calls the position-based assignment the defect most
 * likely to ship, and it fails silently - the request succeeds and the wrong
 * people are assigned to the wrong branch. The model holds keys and computes
 * positions once, in `request()`; these are the cases that would catch it
 * regressing to positions in state.
 */
function draft(): OrganizationDraft {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  return TestBed.inject(OrganizationDraft);
}

/**
 * A draft with three named branches and one staff member at the last two.
 *
 * Built the way the screen builds one: append an entry, then set it whole. There is
 * no path that leaves a half-filled row on the draft, because the forms hold their
 * own values until they are submitted.
 */
function withThreeBranches(): { draft: OrganizationDraft; keys: readonly string[] } {
  const organization = draft();

  organization.setName('Cairo Physio');
  organization.setPlan('Standard');

  for (const name of ['Maadi', 'Nasr City', 'Zamalek']) {
    organization.setBranch(organization.addBranchEntry(), { name, phone: '' });
  }

  const keys = organization.branches().map((branch) => branch.key);

  organization.setStaff(organization.addStaffEntry(), {
    fullName: 'Mona Adel',
    email: 'mona@example.com',
    roles: ['Clinician'],
    specialityCode: '',
    branchKeys: [keys[1], keys[2]],
  });

  return { draft: organization, keys };
}

describe('OrganizationDraft', () => {
  it('computes branch positions only when the request is built', () => {
    const { draft: organization } = withThreeBranches();

    expect(organization.request().staff[0].branchPositions).toEqual([1, 2]);
  });

  it('keeps every assignment correct when a branch moves', () => {
    const { draft: organization, keys } = withThreeBranches();

    // Zamalek to the front: the member works at Nasr City and Zamalek before and
    // after, and only the numbers those two answer to have changed.
    organization.moveBranch(keys[2], -1);
    organization.moveBranch(keys[2], -1);

    expect(organization.branches().map((branch) => branch.name)).toEqual([
      'Zamalek',
      'Maadi',
      'Nasr City',
    ]);
    expect(organization.request().staff[0].branchPositions).toEqual([2, 0]);
  });

  it('drops only the removed branch from an assignment, and renumbers nothing', () => {
    const { draft: organization, keys } = withThreeBranches();

    // Removing the FIRST branch, which the member does not work at. Under a
    // position-based model every remaining assignment shifts down by one and
    // nothing says so.
    organization.removeBranch(keys[0]);

    expect(organization.branches().map((branch) => branch.name)).toEqual(['Nasr City', 'Zamalek']);
    expect(organization.request().staff[0].branchPositions).toEqual([0, 1]);
  });

  it('leaves a staff member at their other branches when one of theirs is removed', () => {
    const { draft: organization, keys } = withThreeBranches();

    organization.removeBranch(keys[1]);

    expect(organization.staff()[0].branchKeys).toEqual([keys[2]]);
    expect(organization.request().staff[0].branchPositions).toEqual([1]);
  });

  it('never sends a position for a branch that is gone', () => {
    const { draft: organization, keys } = withThreeBranches();

    organization.removeBranch(keys[1]);
    organization.removeBranch(keys[2]);

    // Not `[-1]`, which a server would read as a real index. The removal path
    // already dropped these; `request()` refuses them a second time.
    expect(organization.request().staff[0].branchPositions).toEqual([]);
  });

  it('refuses to move a branch off either end of the list', () => {
    const { draft: organization, keys } = withThreeBranches();

    organization.moveBranch(keys[0], -1);
    organization.moveBranch(keys[2], 1);

    expect(organization.branches().map((branch) => branch.name)).toEqual([
      'Maadi',
      'Nasr City',
      'Zamalek',
    ]);
  });

  it('trims what it sends and omits the optional fields it has nothing for', () => {
    const organization = draft();

    organization.setName('  Cairo Physio  ');
    organization.setPlan('Standard');
    organization.setBranch(organization.addBranchEntry(), { name: '  Maadi  ', phone: '   ' });

    const request = organization.request();

    expect(request.name).toBe('Cairo Physio');
    // An empty phone is absent rather than `''`: a blank string is a value, and
    // the field is optional (P-05.2).
    expect(request.branches[0]).toEqual({ name: 'Maadi' });
  });

  // ---------------------------------------------------------------------------
  // What each step needs before the next one is offered
  // ---------------------------------------------------------------------------

  it('finishes the practice step on a name and a plan', () => {
    const organization = draft();

    expect(organization.practiceIsComplete()).toBe(false);

    organization.setName('Cairo Physio');
    expect(organization.practiceIsComplete()).toBe(false);

    organization.setPlan('Standard');
    expect(organization.practiceIsComplete()).toBe(true);
  });

  it('finishes the branches step on one named branch', () => {
    const organization = draft();

    expect(organization.branchesAreComplete()).toBe(false);

    // An appended entry with nothing in it is not a branch. The screen never leaves
    // one in this state - the form submits a whole branch or nothing - but the rule
    // is the draft's rather than the form's, and it is what a second caller would
    // be held to.
    const key = organization.addBranchEntry();
    expect(organization.branchesAreComplete()).toBe(false);

    organization.setBranch(key, { name: 'Maadi', phone: '' });
    expect(organization.branchesAreComplete()).toBe(true);
  });

  it('lets the staff step be finished with nobody in it, but not with half a person', () => {
    const { draft: organization, keys } = withThreeBranches();

    // A practice can be created with no staff - they can be added later.
    expect(organization.staffAreComplete()).toBe(true);

    const key = organization.addStaffEntry();
    expect(organization.staffAreComplete()).toBe(false);

    // Every one of the four is required (P-05.3), and a person missing any of them
    // is somebody who was started and abandoned.
    organization.setStaff(key, {
      fullName: 'Omar Hassan',
      email: 'omar@example.com',
      roles: ['Receptionist'],
      specialityCode: '',
      branchKeys: [],
    });
    expect(organization.staffAreComplete()).toBe(false);

    organization.setStaff(key, {
      fullName: 'Omar Hassan',
      email: 'omar@example.com',
      roles: ['Receptionist'],
      specialityCode: '',
      branchKeys: [keys[0]],
    });
    expect(organization.staffAreComplete()).toBe(true);
  });

  it('ends the draft on reset', () => {
    const { draft: organization } = withThreeBranches();

    organization.reset();

    expect(organization.name()).toBe('');
    expect(organization.branchCount()).toBe(0);
    expect(organization.staffCount()).toBe(0);
  });
});

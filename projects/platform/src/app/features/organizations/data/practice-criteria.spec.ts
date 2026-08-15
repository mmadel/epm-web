import { convertToParamMap } from '@angular/router';
import { ListedOrganization, ListedOrganizationStatusEnum } from 'api-client';

import {
  ANY,
  appliedTags,
  Criteria,
  criteriaQuery,
  facetsOf,
  isRefined,
  matches,
  ordered,
  readCriteria,
} from './practice-criteria';

/**
 * The criteria, tested as the pure functions they are.
 *
 * THE SCREEN'S SPEC DRIVES THE PANEL; THIS DRIVES THE RULES UNDER IT. Which
 * practices a set of criteria keeps, and what number goes beside each option, are
 * decidable without a DOM - and they are the two things that would be wrong in a
 * way nobody could see: a facet count off by one still looks like a facet count.
 */
const NOW = Date.parse('2026-08-15T12:00:00Z');

function practice(over: Partial<ListedOrganization> = {}): ListedOrganization {
  return {
    id: 'org-1',
    name: 'Nile Care',
    plan: 'Standard',
    status: ListedOrganizationStatusEnum.Active,
    clinicCount: 2,
    staffCount: 6,
    createdAt: '2026-08-01T09:00:00Z',
    ...over,
  };
}

function criteria(over: Partial<Criteria> = {}): Criteria {
  return { ...ANY, ...over };
}

describe('readCriteria', () => {
  it('reads every criterion out of the address', () => {
    const read = readCriteria(
      convertToParamMap({
        name: 'care',
        status: 'ACTIVE,SUSPENDED',
        plan: 'Basic',
        branches: '5',
        staff: '25',
        from: '2026-01-01',
        to: '2026-03-31',
        by: 'staff',
        dir: 'desc',
      }),
    );

    expect(read).toEqual({
      name: 'care',
      statuses: ['ACTIVE', 'SUSPENDED'],
      plans: ['Basic'],
      branches: 5,
      staff: 25,
      from: '2026-01-01',
      to: '2026-03-31',
      order: 'staff',
      direction: 'desc',
    });
  });

  it('drops what this build does not offer rather than passing it on', () => {
    const read = readCriteria(
      convertToParamMap({ branches: '2.5', staff: '-1', from: '31-03-2026', by: 'salary' }),
    );

    // A hand-typed parameter is a link somebody edited or a bookmark from a build
    // that offered something this one does not, and the answer to both is the
    // unrefined list rather than a filter nothing on screen explains.
    expect(read).toEqual(ANY);
  });

  it('honours a threshold that is not one of this platform’s steps', () => {
    // The steps are computed from the practices on the platform, so they differ
    // between platforms and change as one grows. A link shared last month still
    // means what it says, and the panel shows the odd step so it can be taken off.
    expect(readCriteria(convertToParamMap({ branches: '7' })).branches).toBe(7);
  });

  it('leaves a default out of the address entirely', () => {
    // Not `?name=&status=&branches=0`. The address somebody shares should say what
    // they were looking at and nothing else.
    expect(criteriaQuery(ANY)).toEqual({
      name: null,
      status: null,
      plan: null,
      branches: null,
      staff: null,
      from: null,
      to: null,
      by: null,
      dir: null,
    });
  });

  it('never writes a direction without an ordering to apply it to', () => {
    expect(criteriaQuery(criteria({ direction: 'desc' }))['dir']).toBeNull();
    expect(criteriaQuery(criteria({ order: 'staff', direction: 'desc' }))['dir']).toBe('desc');
  });

  it('survives the round trip through the address', () => {
    const asked = criteria({
      name: 'care',
      statuses: ['CLOSED'],
      plans: ['Basic', 'Standard'],
      branches: 2,
      staff: 50,
      from: '2025-04-01',
      to: '2025-06-30',
      order: 'name',
    });

    const params = criteriaQuery(asked);

    expect(
      readCriteria(
        convertToParamMap(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, value]) => value !== null)
              .map(([key, value]) => [key, `${value}`]),
          ),
        ),
      ),
    ).toEqual(asked);
  });

  it('counts a date bound as a refinement', () => {
    expect(isRefined(criteria({ from: '2026-01-01' }))).toBe(true);
    expect(isRefined(criteria({ to: '2026-01-01' }))).toBe(true);
  });

  it('counts a name alone as unrefined, because the server matches it', () => {
    // The distinction decides whether the console reads one page or every page.
    expect(isRefined(criteria({ name: 'care' }))).toBe(false);
    expect(isRefined(criteria({ statuses: ['CLOSED'] }))).toBe(true);
    // Ordering counts: sorting one page by staff puts the biggest practice ON THAT
    // PAGE at the top and calls it the biggest.
    expect(isRefined(criteria({ order: 'staff' }))).toBe(true);
  });
});

describe('matches', () => {
  it('keeps a practice in any of the chosen statuses', () => {
    const asked = criteria({ statuses: ['ACTIVE', 'SUSPENDED'] });

    expect(matches(practice(), asked)).toBe(true);
    expect(matches(practice({ status: ListedOrganizationStatusEnum.Closed }), asked)).toBe(false);
  });

  it('reads a size step as "this many or more"', () => {
    expect(matches(practice({ clinicCount: 5 }), criteria({ branches: 5 }))).toBe(true);
    expect(matches(practice({ clinicCount: 4 }), criteria({ branches: 5 }))).toBe(false);
  });

  it('takes both ends of the date range as inclusive', () => {
    const asked = criteria({ from: '2026-08-01', to: '2026-08-31' });

    // The same date typed into both ends means that day, which is what a reader
    // asking "what came in on the 1st" means by it.
    expect(matches(practice({ createdAt: '2026-08-01T00:00:00Z' }), asked)).toBe(true);
    expect(matches(practice({ createdAt: '2026-08-31T23:59:00Z' }), asked)).toBe(true);
    expect(matches(practice({ createdAt: '2026-07-31T23:59:00Z' }), asked)).toBe(false);
    expect(matches(practice({ createdAt: '2026-09-01T00:01:00Z' }), asked)).toBe(false);
  });

  it('takes one open end as a question rather than an incomplete answer', () => {
    expect(
      matches(practice({ createdAt: '2026-08-01T09:00:00Z' }), criteria({ from: '2026-07-01' })),
    ).toBe(true);
    expect(
      matches(practice({ createdAt: '2026-06-01T09:00:00Z' }), criteria({ from: '2026-07-01' })),
    ).toBe(false);
    expect(
      matches(practice({ createdAt: '2026-06-01T09:00:00Z' }), criteria({ to: '2026-07-01' })),
    ).toBe(true);
  });

  it('keeps no practice whose date never arrived inside a range', () => {
    // The alternative puts a practice inside "onboarded in March" on the strength of
    // the console not knowing when it was onboarded.
    expect(matches(practice({ createdAt: undefined }), criteria({ from: '2026-01-01' }))).toBe(
      false,
    );
  });

  it('keeps everything when nothing is asked for', () => {
    expect(matches(practice({ createdAt: undefined, clinicCount: undefined }), ANY)).toBe(true);
  });
});

describe('ordered', () => {
  const rows = [
    practice({ id: 'a', name: 'Zaki Clinic', staffCount: 3 }),
    practice({ id: 'b', name: 'Alexandria', staffCount: 40 }),
    practice({ id: 'c', name: 'Nile Care', staffCount: 12 }),
  ];

  it('leaves the server’s order alone by default', () => {
    // The route sorts, this screen does not know how, and re-sorting page one by
    // name would silently disagree with page two.
    expect(ordered(rows, ANY).map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('orders by a figure, most first when asked', () => {
    expect(
      ordered(rows, criteria({ order: 'staff', direction: 'desc' })).map((row) => row.id),
    ).toEqual(['b', 'c', 'a']);
  });

  it('orders by name the way a reader reads a list', () => {
    expect(ordered(rows, criteria({ order: 'name' })).map((row) => row.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('does not reorder the array it was handed', () => {
    const held = [...rows];

    ordered(held, criteria({ order: 'name' }));

    // It is the array the resource is holding; `sort` works in place.
    expect(held.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('facetsOf', () => {
  const rows = [
    practice({
      id: '1',
      status: ListedOrganizationStatusEnum.Active,
      plan: 'Standard',
      clinicCount: 6,
      staffCount: 40,
    }),
    practice({
      id: '2',
      status: ListedOrganizationStatusEnum.Suspended,
      plan: 'Basic',
      clinicCount: 2,
      staffCount: 9,
    }),
    practice({
      id: '3',
      status: ListedOrganizationStatusEnum.Active,
      plan: 'Basic',
      clinicCount: 1,
      staffCount: 4,
    }),
  ];

  it('counts each option with its own group lifted', () => {
    const facets = facetsOf(rows, criteria({ statuses: ['SUSPENDED'] }), NOW);

    // With `Suspended` chosen, the number beside `Active` has to be how many would
    // be there if the reader pressed it - not zero, which is how many are on screen.
    expect(facets.statuses.map((facet) => [facet.label, facet.count])).toEqual([
      ['Active', 2],
      ['Suspended', 1],
      ['Closed', 0],
    ]);
  });

  it('counts every other group against what is chosen', () => {
    const facets = facetsOf(rows, criteria({ statuses: ['ACTIVE'] }), NOW);

    // Two active practices, one on each plan: the plan counts are about the active
    // ones, because status is not the group being counted here.
    expect(facets.plans.map((facet) => [facet.label, facet.count])).toEqual([
      ['Basic', 1],
      ['Standard', 1],
    ]);
  });

  it('offers the plans that are on the platform, not a list written here', () => {
    // `listPlans` answers what may be sold. This group is about what practices are
    // on, and a plan withdrawn last year is still worth filtering by.
    expect(facetsOf(rows, ANY, NOW).plans.map((facet) => facet.value)).toEqual([
      'Basic',
      'Standard',
    ]);
  });

  it('offers a status the server sent that this build has not been taught', () => {
    const facets = facetsOf(
      [...rows, practice({ status: 'ARCHIVED' as ListedOrganizationStatusEnum })],
      ANY,
      NOW,
    );

    // An unrecognised status is still somebody's practice, and leaving it out of
    // the panel would make it unfindable.
    expect(facets.statuses.map((facet) => facet.value)).toContain('ARCHIVED');
  });

  it('reads its size steps off the practices rather than out of the air', () => {
    // Branch counts of 6, 2 and 1: the median is 2 and the top of the range is 6.
    // Written into the source as `2+ / 5+ / 10+`, the last of those would be a chip
    // that can never do anything on a platform like this one.
    expect(facetsOf(rows, ANY, NOW).branches.map((facet) => [facet.label, facet.count])).toEqual([
      ['2+', 2],
      ['6+', 1],
    ]);
  });

  it('keeps showing a threshold that came off a link', () => {
    const facets = facetsOf(rows, criteria({ branches: 5 }), NOW);

    // A filter applied to the list and missing from the panel is a filter nobody
    // can turn off, which is the worst thing a panel can do.
    expect(facets.branches.map((facet) => facet.label)).toEqual(['2+', '5+', '6+']);
    expect(facets.anyBranches).toBe(3);
  });

  it('offers the views the platform can actually answer', () => {
    const facets = facetsOf(rows, ANY, NOW);

    // No plan here is called a trial, so no `On trial` view is offered: a view that
    // is permanently nothing teaches a reader to ignore the row it is in.
    expect(facets.views.map((view) => `${view.label} ${view.count}`)).toEqual([
      'Needs attention 1',
      'New this month 3',
      'Large accounts 1',
    ]);
    // `New this month` is the month the answer arrived in, not a rolling thirty days.
    expect(facets.views[1].criteria.from).toBe('2026-08-01');
  });

  it('offers a trial view where the platform has a trial plan', () => {
    const facets = facetsOf([...rows, practice({ plan: 'Trial 30' })], ANY, NOW);

    expect(facets.views.map((view) => view.label)).toContain('On trial');
  });
});

describe('appliedTags', () => {
  it('names each criterion by its group, and takes only that one off', () => {
    const asked = criteria({
      name: 'care',
      statuses: ['SUSPENDED'],
      plans: ['Basic'],
      branches: 2,
    });

    const tags = appliedTags(asked);

    expect(tags.map((tag) => `${tag.group}: ${tag.value}`)).toEqual([
      'Status: Suspended',
      'Plan: Basic',
      'Branches: 2+',
    ]);

    // Removing one leaves the rest exactly as they were - which is the operation
    // somebody narrowing a list performs, and which a reset cannot do.
    expect(tags[1].without).toEqual({ ...asked, plans: [] });
  });

  it('says nothing about a name, which the search box is already saying', () => {
    expect(appliedTags(criteria({ name: 'care' }))).toEqual([]);
  });

  it('words a date range, however many ends it has', () => {
    const said = (over: Partial<Criteria>): string =>
      appliedTags(criteria(over)).map((tag) => tag.value)[0] ?? '';

    expect(said({ from: '2026-03-01', to: '2026-03-31' })).toBe('1 Mar 2026 – 31 Mar 2026');
    // An open end is said as one rather than filled in with today's date, which
    // would be this console answering a question the reader left open.
    expect(said({ from: '2026-03-01' })).toBe('from 1 Mar 2026');
    expect(said({ to: '2026-03-31' })).toBe('until 31 Mar 2026');
  });

  it('says nothing about the ordering, which its own column is saying', () => {
    // The ordering is drawn on the column it orders, with an arrow, directly above
    // the rows it arranged. A tag for it here would be the same fact twice - and
    // "Clear all" would silently rearrange a list nobody asked it to touch.
    expect(appliedTags(criteria({ order: 'onboarded', direction: 'desc' }))).toEqual([]);
  });
});

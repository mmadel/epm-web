/**
 * The contract this library exists to enforce, asserted at compile time.
 *
 * Almost nothing here runs. The assertions are types, and a type assertion that
 * fails is a compilation error — which is the whole point of the ticket: a field
 * the backend renames must stop the build here, in a workspace that cannot yet
 * be wrong at runtime, rather than reach a user as an `undefined`.
 *
 * So read a red line in this file as "the API changed and the client was not
 * regenerated", not as "a test needs updating". The fix is `npm run generate:api`
 * — and if the regenerated client still fails these assertions, then the API
 * genuinely changed shape and every caller needs looking at.
 */

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';

import {
  PlatformOnboardingService,
  StaffRequestRolesEnum,
  type OnboardOrganizationRequest,
  type OnboardOrganizationResponse,
  type Problem,
} from './public-api';

// ---------------------------------------------------------------------------
// Assertion helpers.
//
// `Assert<T>` only compiles when `T` is exactly `true`, so each `type _c… =`
// below is a claim the compiler has to agree with.
// ---------------------------------------------------------------------------

type Assert<T extends true> = T;

/**
 * Exact type equality, not mutual assignability.
 *
 * The doubled function signature is the standard trick for it: two conditional
 * types are only identical to the compiler when their checked types are, so this
 * distinguishes `'a' | 'b'` from `string`, which `extends` in both directions
 * does not.
 */
type Equals<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;

/** Whether a value of shape `A` may be passed where `B` is expected. */
type IsAssignable<A, B> = A extends B ? true : false;

// ---------------------------------------------------------------------------
// Criterion 5 — the request permits exactly the four fields the caller owns.
// ---------------------------------------------------------------------------

// Every key, and nothing else. This is the half of the criterion that says "no
// server-set field": were `id`, `status`, `seatLimit` or a timestamp to appear in
// the request schema, this equality would fail and name the extra key. A caller
// cannot claim an identifier the server has not issued yet.
export type _c5_keys = Assert<
  Equals<keyof OnboardOrganizationRequest, 'clinics' | 'name' | 'plan' | 'staff'>
>;

// All four are required, so none can be forgotten. Each of these says: a body
// missing this one field is not a valid request.
export type _c5_name_required = Assert<
  Equals<IsAssignable<Omit<OnboardOrganizationRequest, 'name'>, OnboardOrganizationRequest>, false>
>;
export type _c5_plan_required = Assert<
  Equals<IsAssignable<Omit<OnboardOrganizationRequest, 'plan'>, OnboardOrganizationRequest>, false>
>;
export type _c5_clinics_required = Assert<
  Equals<
    IsAssignable<Omit<OnboardOrganizationRequest, 'clinics'>, OnboardOrganizationRequest>,
    false
  >
>;
export type _c5_staff_required = Assert<
  Equals<IsAssignable<Omit<OnboardOrganizationRequest, 'staff'>, OnboardOrganizationRequest>, false>
>;

// ---------------------------------------------------------------------------
// Criterion 6 — the response carries every id the call generated.
//
// The 201 and the 200 are the same schema in the specification, deliberately: a
// client that retried after a timeout gets an identical body and needs no second
// code path. That is why the generated method has one response type rather than a
// union of two, and asserting on it asserts on both.
// ---------------------------------------------------------------------------

export type _c6_keys = Assert<
  Equals<
    keyof OnboardOrganizationResponse,
    'clinics' | 'organizationId' | 'staff' | 'subscriptionId'
  >
>;

// ---------------------------------------------------------------------------
// Criterion 7 — the error type carries a required `code`.
//
// `code` is the member every caller branches on (LLD §7), so it is the one member
// that may never be absent.
// ---------------------------------------------------------------------------

export type _c7_code_is_a_string = Assert<Equals<Problem['code'], string>>;

// A problem without a `code` is not a `Problem`. `Problem` also carries an index
// signature, because RFC 9457 lets a particular code attach the facts it needs —
// which is exactly why `code` being required has to be asserted rather than
// assumed.
export type _c7_code_required = Assert<Equals<IsAssignable<Omit<Problem, 'code'>, Problem>, false>>;

// ---------------------------------------------------------------------------
// Criterion 2 — a correctly shaped body compiles, and the response is typed.
// ---------------------------------------------------------------------------

const VALID_BODY: OnboardOrganizationRequest = {
  name: 'Nile Family Practice',
  plan: 'STANDARD',
  clinics: [{ name: 'Maadi branch', phone: '+20 2 1234 5678' }],
  staff: [
    {
      fullName: 'Dr. Hana Fahmy',
      email: 'hana.fahmy@example.com',
      // A `Set`, not an array, because the specification marks `roles`
      // `uniqueItems: true`. See the note at the foot of this file.
      roles: new Set([StaffRequestRolesEnum.Doctor]),
      clinics: [0],
      specialtyCode: 'GP',
    },
  ],
};

/**
 * Criterion 3, stated as a type rather than as a build failure.
 *
 * `nmae` is the misspelling. Because the correct `name` is then absent, the shape
 * is not a valid request — and this assertion holds only while that stays true.
 *
 * The criterion asks for more than this, though: that `ng build` **fails, naming
 * that field**. An assertion cannot show that, only a real call can, so the
 * pull request for this ticket carries the compiler's own output. Reproduce it by
 * misspelling a key in `VALID_BODY` above:
 *
 *     error TS2353: Object literal may only specify known properties, and
 *     'nmae' does not exist in type 'OnboardOrganizationRequest'.
 */
export type _c3_a_misspelled_field_is_not_a_request = Assert<
  Equals<
    IsAssignable<
      { nmae: string; plan: string; clinics: unknown[]; staff: unknown[] },
      OnboardOrganizationRequest
    >,
    false
  >
>;

describe('the generated API client', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  // The assertions above are erased before this file runs, so they prove nothing
  // about the client being usable — only about its types. This is the other half:
  // the generated service is injectable as it stands, with no module of ours and
  // no provider of ours, and it really does expose one method per operationId.
  it('provides onboardOrganization through Angular dependency injection', () => {
    const service = TestBed.inject(PlatformOnboardingService);

    expect(service.onboardOrganization).toBeInstanceOf(Function);

    // Typed all the way through: the call site below would not compile if the
    // body were wrong, and `created` would not compile if the response were.
    const created: Observable<OnboardOrganizationResponse> = service.onboardOrganization(
      'a-retry-key-for-one-user-action',
      VALID_BODY,
    );

    expect(created.subscribe).toBeInstanceOf(Function);
  });
});

/*
 * A NOTE ON `roles`, FOR WHOEVER WRITES THE FIRST SCREEN (T-64).
 *
 * `StaffRequest.roles` is a `Set`, not an array, because the specification marks
 * it `uniqueItems: true` and that is what openapi-generator maps a unique array
 * to. The type is a faithful translation. The wire format is not:
 * `JSON.stringify(new Set(['DOCTOR']))` is `{}`, and Angular's `HttpClient`
 * serialises a body with `JSON.stringify`, so a request built through this client
 * sends `"roles":{}` and the backend sees no roles at all.
 *
 * That is a real defect, and it is deliberately NOT worked around here. This
 * ticket may not hand-edit generated output and may not wrap it in a service of
 * ours - either would put a second description of the API back into the
 * workspace, which is the one thing generating a client is meant to prevent. The
 * fix belongs upstream: drop `uniqueItems` from `roles` in the backend
 * specification (the field is a JSON array on the wire either way, and
 * uniqueness is a validation rule the server already enforces), then run
 * `npm run generate:api`. The type becomes `Array<StaffRequestRolesEnum>` and the
 * `new Set([...])` above becomes `[...]`.
 *
 * Until then, do not send a staff member through this method and expect their
 * roles to arrive.
 */

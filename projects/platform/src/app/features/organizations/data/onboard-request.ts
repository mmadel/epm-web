import { OnboardOrganizationRequest, StaffRequestRolesEnum } from 'api-client';

import { OrganizationDraft } from '../organization-draft';

/**
 * The draft, in the shape the API takes. THE ONLY PLACE A POSITION IS EVER COMPUTED.
 *
 * The API takes each staff member's branches as positions in the `clinics` array
 * (`LLD-ORGANIZATION.md` §2.1), because the branches do not exist yet and so have no
 * ids. The draft holds them as keys instead and this function is where they become
 * numbers - once, at the moment of submission, from the branch list as it is right
 * then.
 *
 * That ordering is the entire defence against the defect the milestone calls the
 * most likely to ship (T-64 §8): holding positions in state means every removal and
 * every reorder has to renumber every staff member, and when one is missed the
 * request still succeeds and the wrong people are assigned to the wrong branch. A
 * key cannot drift when a row moves.
 *
 * IT LIVES IN `data/` BECAUSE IT NAMES THE SERVER'S TYPES, and `data/` is the only
 * folder in a feature that may (see `app/README.md`). That boundary is also where
 * the two vocabularies meet: the console says branch and speciality, the API says
 * clinic and specialty, and the translation between them happens here rather than
 * leaking either name into the other side.
 */
export function onboardRequestFrom(draft: OrganizationDraft): OnboardOrganizationRequest {
  const branches = draft.branches();
  const positionOf = new Map(branches.map((branch, at) => [branch.key, at]));

  return {
    name: draft.name().trim(),
    plan: draft.plan(),
    clinics: branches.map((branch) => ({
      name: branch.name.trim(),
      // Absent rather than `''`: an empty string is a value, and the field is
      // optional (T-64 §4).
      ...(branch.phone.trim() ? { phone: branch.phone.trim() } : {}),
    })),
    staff: draft.staff().map((member) => ({
      fullName: member.fullName.trim(),
      email: member.email.trim(),
      roles: rolesAsSent(member.roles),
      ...(member.specialityCode.trim() ? { specialtyCode: member.specialityCode.trim() } : {}),
      // A key that no longer matches a branch contributes nothing rather than a
      // `-1`: `removeBranch` already drops those, so this is a second line of
      // defence against sending an index that means "the last branch" to a server
      // that reads it as one.
      clinics: member.branchKeys.map((key) => positionOf.get(key)).filter((at) => at !== undefined),
    })),
  };
}

/**
 * The roles, as an ARRAY, through a field the generated client types as a `Set`.
 *
 * The cast is deliberate and the array is correct. The specification marks `roles`
 * with `uniqueItems`, which openapi-generator renders as `Set<StaffRequestRolesEnum>`
 * - but nothing in the generated client serialises it, and `HttpClient` bodies go
 * through `JSON.stringify`, which renders a `Set` as `{}`. Sending the type the
 * compiler asks for would therefore put `"roles": {}` on the wire and earn a 400
 * from a request that type-checked perfectly.
 *
 * So this is a divergence between §4 of the ticket (which shows an array, and is
 * right about the wire) and the generated types (which are right about the
 * specification). It is reported rather than worked around silently - see the PR -
 * and the fix belongs in the generator's configuration or in the specification's
 * `uniqueItems`, not here.
 */
function rolesAsSent(roles: readonly string[]): Set<StaffRequestRolesEnum> {
  return [...roles] as unknown as Set<StaffRequestRolesEnum>;
}

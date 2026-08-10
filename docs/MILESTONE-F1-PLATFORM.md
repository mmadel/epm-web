# Milestone F1 — Platform console

**Repo:** `epm-web`
**Application:** `projects/platform`
**For:** frontend tech lead and engineers
**Status:** structure ready · shell ready · landing page **blocked** · onboarding ready

**Depends on:** F0 merged. `LLD.md` §2 structure, §3 tenancy, §5 authorization, §6 request
and response, §7 errors; `LLD-ORGANIZATION.md` §2.1.

Where this document and `LLD.md` disagree, `LLD.md` wins.

> **Numbering.** F1 is the platform console. Organization screens — `LLD-ORGANIZATION.md`
> §2.2–2.7, the org admin product — are **F2**. An earlier draft called those F1.

---

# 1. What this application is

The internal console for **platform administrators**: the people who run the platform, not
the people who run a practice.

A platform admin does one thing today. They register a new practice on the platform. From
`PRODUCT.md`: they sit _outside every practice_ and _own no patient data, ever_.

## Why it is a separate application

`PRODUCT.md` settled that platform admins live outside every practice specifically so that
"whoever runs the platform must never be able to open a patient's chart" is **structural
rather than a rule someone could relax**.

Shipping this console inside the staff bundle would undo that. One role-gating defect and
the staff surface is reachable from a platform admin's browser.

It is also a different product:

|                      | `platform`            | `staff`            |
| -------------------- | --------------------- | ------------------ |
| Language             | English only          | Arabic and English |
| Direction            | LTR only              | Both               |
| Tenant filter        | **Off** (`LLD.md` §3) | On, every request  |
| Organization context | None                  | Always             |
| Audience             | Internal              | Customers          |

Almost none of F0's i18n work applies here. That is the clearest signal these are two
products.

## What it must never do

| Never                                         | Because                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| Show a patient, a chart, or a reading         | `PRODUCT.md`. The platform owns no patient data       |
| Show a named staff member's clinical activity | Same boundary                                         |
| Import from `projects/staff`                  | That boundary is enforced by lint, not by review      |
| Send an organization id as a tenant hint      | Platform routes run with the filter off (`LLD.md` §3) |

---

# 2. Project structure

This section is the convention for **every** application in the workspace, not just this one.
It is recorded here because `platform` is the first application to have real screens.

## Feature folders, not type folders

```
projects/platform/src/
  app/
    app.ts
    app.config.ts
    app.routes.ts            only lazy references to feature route files

    layout/                  shell instantiation, navigation config, route titles

    features/
      organizations/
        organizations.routes.ts
        pages/               routed components
        components/          used only by this feature
        data/                the only place that touches api-client
```

## Rules

**A feature never imports from another feature.** If two features need the same thing, it
moves to `ui` or `core`. If it does not belong there, it was not shared.

**`data/` is the only place in a feature that touches `api-client`.** Components take inputs
and emit outputs. A component that fetches is a component that cannot be tested without a
network stub.

**Nothing reusable across applications lives in an application.** If `staff` would want it,
it belongs in `ui` or `core`.

**One route file per feature**, lazy-loaded from `app.routes.ts`.

_Rejected: `components/`, `services/`, `models/` at the top level._ It scales by type rather
than by change. Every change to one slice touches four folders, and after twelve features
nobody can say which service belongs to which screen. A feature folder is deletable in one
operation.

---

# 3. Tickets

| #    | Ticket                                 | Status          |
| ---- | -------------------------------------- | --------------- |
| P-00 | Application scaffold and conventions   | ready           |
| P-01 | Lint boundaries for three applications | ready           |
| P-02 | Platform session seam and mock         | ready           |
| P-03 | Shell and navigation                   | ready           |
| P-04 | Landing page — practice list           | **blocked**, §5 |
| P-05 | Onboard a practice                     | ready           |

---

## P-00 — Application scaffold and conventions

`f/P-00-platform-scaffold`

### P-00.1 Generate the application

```
ng generate application platform --style=scss --ssr=false
```

### P-00.2 Port

Set `4400` in `angular.json` under `projects.platform.architect.serve.options`.
`staff` is 4200, `patient` 4300.

### P-00.3 Folder convention

Create the structure in §2 with `features/organizations/` as the first feature. Add a
`README.md` in `src/app/` stating the convention, so it is discovered rather than inferred.

### P-00.4 Exclude from i18n rules

F0's F-00.6 fails the build on `margin-left` and `text-align: left`. This application is
English-only and LTR-only. Add an ESLint override for `projects/platform/**` now, rather
than after someone hits it and works around it.

**It stays excluded.** If this console ever needs Arabic, that is a decision, and the lint
override is where it gets made.

### Done when

- `ng serve platform` runs on 4400 alongside the other two
- The folder convention exists and is documented
- A `margin-left` in `projects/platform` passes lint; the same line in `projects/staff` fails

---

## P-01 — Lint boundaries for three applications

`f/P-01-boundaries`

F0's F-00.5 covered `staff` ↔ `patient`. There are now three applications.

### P-01.1 All pairs

No application may import from another. Three pairs, six directions.

### P-01.2 The pair that matters

**`platform` may not import from `staff`.** This is not a tidiness rule — it is the
structural boundary `PRODUCT.md` relies on. Call it out in a comment beside the rule so
nobody relaxes it for convenience.

### P-01.3 Verify

Commit a deliberate `platform → staff` import, confirm CI is red, remove it.

---

## P-02 — Platform session seam and mock

`f/P-02-session`

`LLD.md` §4: the caller resolver sits behind an interface, a mock implements it today, an
identity provider implements it later, **and swapping them is configuration**.

### P-02.1 Interface

A session interface in `projects/core`. It exposes who is signed in and what kind of actor
they are.

### P-02.2 Platform mock

A mock returning a platform admin. Per `LLD.md` §4, a platform context has **no
organization in it** — the absence is explicit, not an accident. Model it that way: not an
empty string, not a null org id treated as a value. A distinct actor kind.

### P-02.3 A route guard

Routes require a platform admin. With the mock this always passes — the point is that the
seam exists before auth arrives, not that it protects anything yet.

### P-02.4 Do not build a login screen

Auth is blocked on two decisions that have not been made — bearer tokens vs cookie sessions,
and whether platform identity is its own realm. A login form built now is thrown away.

### Done when

- Nothing in `features/` resolves the caller itself
- A test asserts the platform context carries no organization
- No login screen exists

---

## P-03 — Shell and navigation

`f/P-03-shell`

### P-03.1 Instantiate F0's shell

Reuse `ui`'s shell. Do not build a second one. If it does not fit, fix it in `ui` — that is
what "nothing in `ui` may be staff-specific" was for.

### P-03.2 English only, LTR only

No language switch control in the header. Nothing reads the language service.

### P-03.3 Navigation

Two items: the practice list (P-04) and onboarding (P-05). It will not grow quickly — this
console has one job.

### P-03.4 Make it visibly internal

Different accent colour from the staff console, and the environment name shown in the header
in anything other than production.

A platform admin has the widest reach in the system. Knowing at a glance which environment
they are pointed at is worth one line of CSS.

---

## P-04 — Landing page: practice list

`f/P-04-landing`

**Blocked. Do not start.** See §5.

### What it is

The first screen after a platform admin signs in. Every practice on the platform: what
exists, how big it is, and its status.

### Layout

- A table, one row per practice
- Search by name
- Filter by status and by plan
- An "Onboard a practice" control leading to P-05
- Empty state on a fresh install, pointing at onboarding

### What each row shows

Name, plan, status, clinic count, staff count, seat usage, created date.

### What no row ever shows

A patient count, a named staff member, anything clinical. **The platform admin sees that a
practice exists and how big it is. Never who is inside it.**

That distinction is the whole reason this screen needs a purpose-built route rather than
reusing anything from the org slice.

### Done when

- The route exists and is agreed — see §5
- The empty state renders
- No field on the screen is derived from patient data

---

## P-05 — Onboard a practice

`f/P-05-onboarding`

`LLD-ORGANIZATION.md` §2.1. Fully specified — every field, rule, error code, and screen
note. Build against it directly.

`POST /api/v1/platform/organizations`, `operationId` `onboardOrganization`.

### P-05.1 Form structure

Three sections: the practice, its branches, its staff. Branches and staff are repeatable
rows.

### P-05.2 Branches

Name required and unique within the form, phone optional. At least one.

### P-05.3 Staff

Full name, email, roles, optional speciality code, and **at least one branch**.

Roles render as **checkboxes over the full set**, not a multi-select. `LLD-ORGANIZATION.md`
§2.5 establishes this shape for the role editor, and the same control belongs here.

### P-05.4 The clinic position trap — read this twice

Staff reference branches by **array position, not id**. The branches do not exist yet, so
they have no ids.

From `LLD-ORGANIZATION.md` §2.1:

> Remove or reorder a branch row in the form and every staff member's list has to be
> recomputed. Getting it wrong is silent — the request succeeds and the wrong people are
> assigned to the wrong branch.

**Do not store positions in component state.** Hold a stable client-side key per branch row,
and compute positions only at submit time. Then reordering is free and removal cannot
silently shift an assignment.

This is called out in the LLD as _the defect most likely to ship_. It gets its own test.

### P-05.5 Idempotency key

Generated **once**, when the form is submitted. Reused on every retry of that submission.

A new key on retry creates a **second practice**. This is the highest-cost client defect in
the whole product — it produces a duplicate tenant with real rows in it.

### P-05.6 Submission states

Disable the submit control while in flight. The call writes many rows and is not instant.

**200 is success, not an error.** It means an earlier attempt of the same submission
already worked (`LLD.md` §6). Treat 200 and 201 identically in the UI.

### P-05.7 Error mapping

Map each code to the field it names, using F0's error component:

| Code          | Points at                                      |
| ------------- | ---------------------------------------------- |
| `EPM-REQ-001` | The offending field                            |
| `EPM-REQ-002` | That role value                                |
| `EPM-REQ-003` | The header — a client defect, not the user's   |
| `EPM-ORG-001` | That staff member's branch list                |
| `EPM-ORG-002` | The second occurrence of the branch name       |
| `EPM-ORG-003` | The second occurrence of the email             |
| `EPM-ORG-004` | The plan field                                 |
| `EPM-ORG-005` | That staff member's speciality                 |
| `EPM-ORG-006` | The staff list, naming `limit` and `requested` |

**Never show the server's `title`.**

### P-05.8 After success

Every id created is in the response. Nothing needs re-fetching. Go to the practice list.

### P-05.9 Mock

Implements `onboardOrganization`. Must return the error cases, not just success —
`EPM-ORG-006` and `EPM-ORG-002` at minimum. Both are hard to reproduce against a real server
and easy to get wrong in the UI.

### Done when

- Removing or reordering a branch row leaves every staff assignment correct. **Tested**
- One key per submission, reused across retries. **Tested**
- 200 and 201 both render as success. **Tested**
- Every error code above maps to its field
- `title` never reaches the DOM

---

# 4. Definition of done

Per ticket:

- Tests fail without the code
- Lint and build green from a clean checkout
- One commit per subtask. One branch and one PR per ticket, done-list ticked
- Any deviation from `LLD.md` raised **before** the code is written

No component library, no state management, no auth. Build only what these tickets name.

---

# 5. Blocker — the practice list route does not exist

**P-04 cannot be built. There is no route behind it.**

`LLD-ORGANIZATION.md` gives a platform admin exactly one capability: onboard a practice.
There is no route to list practices, and §1 states a platform admin "can create a practice
and can never look inside one afterwards."

Taken literally, a platform admin cannot see what they have onboarded — cannot check whether
a practice already exists before creating a duplicate, and has no landing page content
beyond a button.

I read this as a gap in the design rather than an intended constraint. Listing practices is
not looking inside one.

## Proposed contract — NOT SIGNED OFF

Needs architecture approval and a backend ticket before any frontend work starts.

```
GET /api/v1/platform/organizations
operationId: listPlatformOrganizations
Who:         platform admin only. Anyone else: 404
Tenant filter: off
Query:       ?status=&plan=&q=&page=&size=
```

```json
{
  "items": [
    {
      "id": "0195e2a1-...",
      "name": "Nile Care",
      "status": "ACTIVE",
      "plan": "STANDARD",
      "subscriptionStatus": "ACTIVE",
      "clinicCount": 2,
      "staffCount": 6,
      "seatLimit": 20,
      "trialEndsAt": null,
      "createdAt": "2026-03-01T09:00:00Z"
    }
  ],
  "page": 0,
  "size": 25,
  "total": 1
}
```

**The boundary this preserves.** Counts, not contents. No patient count, no named staff, no
clinical field of any kind. A platform admin learns that a practice exists and how big it
is — never who is inside it.

**Why a purpose-built route and not `GET /organizations`.** That route derives the practice
from the caller and returns one (`LLD-ORGANIZATION.md` §2.2). A platform admin has no
practice. Reusing it would mean accepting an id in the path, and `LLD.md` §3 exists to make
sure no such route is ever written.

**Open question for architecture.** This route returns `subscriptionStatus`, which
`LLD-ORGANIZATION.md` §1 says is billing state and deliberately not read on the request
path. Reading it here is not on the request path for any tenant — but it is a second field
that can disagree with `organization.status`, and someone should say out loud whether that
is acceptable on this screen.

## Until it is agreed

P-04 stops at the empty state and the layout. Do not transcribe the shape above into a mock
and build against it — that turns a proposal into a de facto contract.

P-00, P-01, P-02, P-03, and P-05 are unaffected. **P-05 is the useful work here** and should
be started first.

---

# 6. Decisions recorded here

| Decision                                                              | Rejected                              | Reason                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| The platform console is a third application                           | A route group inside `staff`          | `PRODUCT.md` made the platform admin's exclusion structural. One bundle undoes that                  |
| English only, LTR only, permanently excluded from the i18n lint rules | Applying the workspace i18n rules     | It is an internal console. Adding Arabic later is a decision, and the override is where it gets made |
| Feature folders, `data/` isolating `api-client`                       | `components/`, `services/`, `models/` | Type folders scale by type rather than by change. A feature folder is deletable in one operation     |
| Branch positions computed at submit time from stable row keys         | Storing positions in component state  | The LLD names silent mis-assignment on reorder as the defect most likely to ship                     |
| No login screen in this milestone                                     | Building one against the mock         | Auth is blocked on the token and realm decisions. It would be thrown away                            |
| P-04 stops at the empty state                                         | Mocking the proposed list route       | Building against a proposal makes it a contract before anyone signs it off                           |

---

# 7. Blocking, owned elsewhere

| #   | Item                                                        | Blocks                                        | Owner                      |
| --- | ----------------------------------------------------------- | --------------------------------------------- | -------------------------- |
| 1   | `GET /platform/organizations` does not exist                | **P-04**                                      | Architecture, then backend |
| 2   | Nothing generates an OpenAPI specification (`LLD.md` §13.4) | Every real call in P-05                       | Backend lead               |
| 3   | Bearer tokens vs cookie sessions                            | Login, P-02.4                                 | Architecture               |
| 4   | Is platform identity its own realm?                         | Login, P-02.4                                 | Architecture               |
| 5   | Onboarded staff cannot sign in (`LLD-ORGANIZATION.md` §5.1) | The practice being usable after P-05 succeeds | Architecture               |

**Item 5 deserves attention.** P-05 will onboard practices successfully, and every one of
them will contain staff who cannot sign in. The screen works; the outcome is unusable. Worth
saying plainly to whoever demos this.

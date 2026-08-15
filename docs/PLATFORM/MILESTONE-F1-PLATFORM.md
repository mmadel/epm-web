# Milestone F1 — Platform console

**Repo:** `epm-web`
**Application:** `projects/platform`
**For:** frontend tech lead and engineers
**Status:** structure ready · shell ready · landing page ready (§5 lifted) · onboarding ready

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

| #    | Ticket                                 | Status           |
| ---- | -------------------------------------- | ---------------- |
| P-00 | Application scaffold and conventions   | ready            |
| P-01 | Lint boundaries for three applications | ready            |
| P-02 | Platform session seam and mock         | ready            |
| P-03 | Shell and navigation                   | ready            |
| P-04 | Landing page — practice list           | ready, §5 lifted |
| P-05 | Onboard a practice                     | ready            |

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

**No longer blocked.** §5 asked architecture for a list route and one exists:
`GET /api/v1/platform/organizations`, `operationId` `listOrganizations`, in the
generated client and specified in `LLD-ORGANIZATION.md` §2.8. It is not the shape
§5 proposed — see the note under **Layout** — and the screen is built against what
the client actually generates rather than against the proposal.

### What it is

The first screen after a platform admin signs in. Every practice on the platform: what
exists, how big it is, and its status.

### Layout

- ~~A table, one row per practice~~ — **two-line rows with a status leading edge**,
  which is what the design review chose and what `Shell and navigation.html` §5
  records the table as the rejected alternative to. It was built as a table first
  and rebuilt; §5's decision table is the authority on this screen's shape
- Search by name, in §6's field with the count inside it. `?name=` and `?page=` are
  query parameters, so a search is shareable and the back button works (§6, "the URL
  is the state"). The count is **inside the field** as §6 asks — it sat at the far
  end of the toolbar first, answering about the field from the other side of the
  screen. The field also says when a call is in flight (a line on its own bottom
  edge), the rows **mark the run of each name that matched**, and an empty focused
  field offers the searches this session has already run
- **One search band, always on screen**, holding every criterion: the **name**, then
  **Status**, **Plan** and **Size** as menus, then an **Onboarded** date range, then a
  row of one-press **views** (`Needs attention`, `New this month`, `On trial`,
  `Large accounts`) and the count of what it all leaves. Every option inside a menu
  carries the number of practices it would leave, and every menu says what it is set
  to on its own face. The route still offers none of it: `listOrganizations` takes
  `name`, `page` and `size` and nothing else, and it is still raised for the backend
  — see **How the filters are honest**
- ~~A `Refine` button that opens the criteria~~ — **removed.** It put a click in front
  of every question except one, made the name a first-class criterion and the rest
  second-class, and hid what the list was narrowed by behind a control that had to be
  pressed to find out. The band costs one row and removes all three
- ~~A 25 / 50 / 100 rows-per-page control~~ — **removed.** It asked the reader to
  answer a question about the screen before they could ask one about a practice, and
  the console pages what MATCHED now rather than what the server sent — so the page
  length is a reading decision with one right answer (fifty) rather than a preference

- **Order from the column headings** — three presses: by that column, turned round,
  back to the order the server sent. It is on the columns rather than in the panel
  because the console now holds every matching practice, which is the only thing that
  makes a sorting heading honest: a heading that sorted a page would arrange the
  twenty-five rows in front of the reader and present the biggest of _those_ as the
  biggest practice on the platform
- An "Onboard a practice" control leading to P-05
- Empty state on a fresh install, pointing at onboarding
- A pager, which the proposal in §5 implied and this section did not name

### What each row shows

Name, plan, status, clinic count, staff count, ~~seat usage~~, created date.

**The seat meter and the disclosure chevron are on `/practices/:id`**, a screen this
milestone did not name and which the design implied by asking a row for a chevron.
`getOrganizationById` is the route that carries a subscription, so that is where the
meter's figures actually are — along with both statuses and every branch, active and
inactive. The chevron opens it.

### How the filters are honest

**§6.1's objection was right and is still right:** a filter applied to the
twenty-five rows the screen is holding answers about the page, not about the
platform, and "3 suspended" computed that way is a statement about a page dressed up
as one about the platform.

So the console does not filter the page. `Practices` reads **every page for the
current name** (100 at a time, in parallel after the first) and applies the criteria,
the ordering and the paging to all of it. One sweep per name: pressing an option
re-filters what is already held and issues no request at all — the resource is keyed
on the only thing the server varies by, which is the name.

It sweeps on arrival rather than waiting for a criterion to be engaged, because the
band is always on screen and every count in it is always true. On a platform that
fits in one page — most of them — that is still exactly one request.

**It reads at most 2,000 practices**, and says so on the panel when there were more
(`Counted over the first N practices. Search by name to narrow the rest.`). A count
over part of the platform presented as a count over the platform is the one failure
this whole arrangement exists to avoid, so the limit is on the screen rather than in
a comment.

**The onboarding criterion is a date range, not a named window.** "Last 90 days"
cannot say "the second quarter", and a support thread or an invoice query is always
about a period somebody else has already named. Both ends are inclusive and either
may be left off. `New this month` survives as a view, for the reader who wants one
press rather than two dates.

**The size steps are read off the platform, not written here.** They were
`2+ / 5+ / 10+`, which is a guess about a platform this console has never seen: on
one made of single-site practices, `10+` is a chip that can never do anything. The
median, the upper quartile and the top tenth of the practices actually there always
cut the list somewhere. A threshold arriving from an older link is honoured and shown
even when it is not one of the current steps — a filter applied to the list and
missing from the panel is a filter nobody can turn off.

**Every option carries its count, with its own group lifted.** With `Suspended`
chosen, the number beside `Active` is how many would be there if it were pressed —
not zero, which is how many are on screen. An option that would leave nothing is
shown, counted and disabled: a set of options that changes shape as you use it is a
set nobody can learn.

**Every criterion is in the address**, so a filtered list is a link and the back
button takes refinements off one at a time. The panel opens by itself when the
address arrives carrying any.

**When `listOrganizations` learns `status`, `plan` and `sort`,** what gets deleted is
`Practices.everything` — one method. The criteria, the panel and every count on it
stay exactly as they are.

**§6.1's filter pills are still not built, and are not going to be.** The design has
the search box parse a vocabulary — `trial`, `basic`, `read-only` — into pills. Two
of those three words are not in the status enum at all, and a box that silently turns
some words into filters and leaves the rest as a name is a box nobody can predict.
The panel is what those pills were for.

**Nothing in this console edits a practice**, because no route does. §7 item 1e.

**A search is not a journey, and the frame had to be told.** `ConsoleLayout` moves
focus to the new page's `h1` after every completed navigation, which is right for a
link and wrong for this screen: the search and the pager keep their state in the
address, so typing four letters was four completed navigations — each one taking the
caret out of the box being typed into and reading "Practices" over the reader. The
frame now compares the path and leaves focus alone when only the query changed. The
search box was unusable with a keyboard until it did.

**Seat usage is not on the row**, because `ListedOrganization` does not carry it —
no `seatLimit`, no `subscriptionStatus`, no `trialEndsAt`. The shipped contract is
narrower than the one §5 proposed, and the screen shows what it answers rather than
computing a figure out of a plan's limit and a staff count, which would be a number
nobody sent. `getOrganizationById` has the subscription with both limits and both
usage figures, for the practice screen that reads one.

Which also closes §5's open question for architecture: `subscriptionStatus` is not
in the list response, so nothing on this screen can disagree with
`organization.status`.

### What no row ever shows

A patient count, a named staff member, anything clinical. **The platform admin sees that a
practice exists and how big it is. Never who is inside it.**

That distinction is the whole reason this screen needs a purpose-built route rather than
reusing anything from the org slice.

### Done when

- The route exists and is agreed — see §5. **Done**: `listOrganizations`
- The empty state renders. **Done**, and there are two of them: a platform with no
  practices on it points at onboarding, and a search that matched nothing says so
  rather than claiming the platform is empty
- No field on the screen is derived from patient data. **Tested** — the screen's
  spec asserts that nothing on it names a person or a patient, which fails the
  moment somebody enriches a row from a second call
- A failed call is not rendered as an empty platform. **Tested.** It was not on
  this list and it is the defect that matters most here: "there are no practices"
  and "we could not ask" are different facts, and rendering the first for the
  second is how somebody onboards a practice that already exists

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

# 5. Blocker — the practice list route did not exist. It does now.

**LIFTED.** `GET /api/v1/platform/organizations` is specified in
`LLD-ORGANIZATION.md` §2.8 and generated into the client as `listOrganizations`.
P-04 is built against it. The argument below is kept because it is why the route was
asked for, and because the shape that arrived is narrower than the one proposed —
whoever reads this next needs both to see which parts of the design survived.

**What arrived, against what was proposed:**

| Proposed here                                                | Shipped                                              |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| `?status=&plan=&q=&page=&size=`                              | `?name=&page=&size=` — no status or plan filter      |
| `q`                                                          | `name`, matched anywhere, case-insensitive           |
| `{ items, page, size, total }`                               | `{ content, page, size, totalElements, totalPages }` |
| `seatLimit`, `subscriptionStatus`, `trialEndsAt` on each row | absent — none of the three                           |
| `clinicCount`, `staffCount`, `status`, `plan`, `createdAt`   | all present                                          |

The counts-not-contents boundary held exactly, which was the point of asking.

---

**The original argument, for the record:**

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

## Until it was agreed

P-04 stopped at the empty state and the layout. The shape above was deliberately never
transcribed into a mock — building against a proposal turns it into a de facto contract,
and the shipped route differs from it in five places, every one of which would have been
a rewrite rather than a compile error.

---

# 6. Decisions recorded here

| Decision                                                              | Rejected                               | Reason                                                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| The platform console is a third application                           | A route group inside `staff`           | `PRODUCT.md` made the platform admin's exclusion structural. One bundle undoes that                                                         |
| English only, LTR only, permanently excluded from the i18n lint rules | Applying the workspace i18n rules      | It is an internal console. Adding Arabic later is a decision, and the override is where it gets made                                        |
| Feature folders, `data/` isolating `api-client`                       | `components/`, `services/`, `models/`  | Type folders scale by type rather than by change. A feature folder is deletable in one operation                                            |
| Branch positions computed at submit time from stable row keys         | Storing positions in component state   | The LLD names silent mis-assignment on reorder as the defect most likely to ship                                                            |
| No login screen in this milestone                                     | Building one against the mock          | Auth is blocked on the token and realm decisions. It would be thrown away                                                                   |
| P-04 stopped at the empty state until the route shipped               | Mocking the proposed list route        | Building against a proposal makes it a contract before anyone signs it off — and the shipped route differs from the proposal in five places |
| The list is the console's home; `/onboard` is a task opened from it   | Keeping `/onboard` as the landing page | A console whose first screen makes a thing rather than showing what is there cannot answer "does this already exist"                        |
| No navigation band for two screens                                    | A tab strip with two entries           | One entry is always where you already are; the list's own control opens onboarding and the wordmark comes back                              |

---

# 7. Blocking, owned elsewhere

| #      | Item                                                                                                           | Blocks                                                                                                                     | Owner                          |
| ------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| ~~1~~  | ~~`GET /platform/organizations` does not exist~~ — **resolved**, `listOrganizations`                           | ~~P-04~~                                                                                                                   | ~~Architecture, then backend~~ |
| 1a     | No status, plan or sort parameter on the list route                                                            | Nothing now — the console reads every page and filters it (see P-04). Still owed: this does not scale past 2,000 practices | Backend                        |
| ~~1b~~ | ~~The list response carries no seat figure~~ — **resolved on the practice screen**, from `getOrganizationById` | ~~The seat meter~~                                                                                                         | ~~Backend~~                    |
| 1c     | A filtered response carries no unfiltered total                                                                | `<matched> of <total>` in the field (design §6.2)                                                                          | Backend                        |
| ~~1d~~ | ~~There is no practice screen, so nothing is behind a row~~ — **built**, `/practices/:id`                      | ~~The disclosure chevron~~                                                                                                 | ~~Frontend~~                   |
| 1e     | No route changes a practice — the platform API is four reads and one create                                    | Any edit, suspend or close control in this console                                                                         | Architecture, then backend     |
| 2      | Nothing generates an OpenAPI specification (`LLD.md` §13.4)                                                    | Every real call in P-05                                                                                                    | Backend lead                   |
| 3      | Bearer tokens vs cookie sessions                                                                               | Login, P-02.4                                                                                                              | Architecture                   |
| 4      | Is platform identity its own realm?                                                                            | Login, P-02.4                                                                                                              | Architecture                   |
| 5      | Onboarded staff cannot sign in (`LLD-ORGANIZATION.md` §5.1)                                                    | The practice being usable after P-05 succeeds                                                                              | Architecture                   |

**Item 5 deserves attention.** P-05 will onboard practices successfully, and every one of
them will contain staff who cannot sign in. The screen works; the outcome is unusable. Worth
saying plainly to whoever demos this.

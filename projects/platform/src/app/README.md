# How this application is laid out

This is the convention for **every** application in the workspace, not just this
one. It is written down here because `platform` is the first application to have
real screens. See `docs/PLATFORM/MILESTONE-F1-PLATFORM.md` §2 for the reasoning.

```
src/app/
  app.ts                     mounts the frame, puts the outlet in it, nothing else
  app.config.ts              the application's configuration - session, environment, titles
  app.routes.ts              only lazy references to feature route files
  route-paths.ts             every path in the console, in one place

  environment/               which environment this bundle was built for
  session/                   who is signed in, and the guard that requires a platform admin
  layout/                    shell instantiation, page header, environment chip, route titles

  features/
    organizations/
      organizations.routes.ts
      organization-draft.ts  the thing being built - see below
      pages/                 routed components
      components/            used only by this feature
      data/                  the only place that touches api-client
```

`data/` holds the four files that name the server's shapes: the request mapper, the
submission, the plans, and the two halves of the error table. Nothing outside it
imports `api-client`, which is what keeps the console's vocabulary and the API's
independent of each other.

Feature folders, not type folders. `components/`, `services/` and `models/` at the
top level were rejected: they scale by type rather than by change, so every change
to one slice touches four folders, and after twelve features nobody can say which
service belongs to which screen. A feature folder is deletable in one operation.

## The rules

**A feature never imports from another feature.** If two features need the same
thing, it moves to `ui` or `core`. If it does not belong there, it was not shared.
Anything the layout and a feature both need - a route path, for instance - belongs
beside `app.routes.ts` rather than inside either of them.

**`data/` is the only place in a feature that touches `api-client`.** Components
take inputs and emit outputs. A component that fetches is a component that cannot
be tested without a network stub.

**Nothing reusable across applications lives in an application.** If `staff` would
want it, it belongs in `ui` or `core`. That is why the frame is `ui`'s shell with
this console's chrome projected into it, and not a second shell.

**One route file per feature**, lazy-loaded from `app.routes.ts`, with the guard on
the boundary rather than inside the feature.

## Three screens, and the one route that is missing

**`/practices` is the landing screen** and `/` redirects to it. It is every
practice on the platform — name, plan, status, branch and staff counts, and when it
was onboarded — with a search by name and a pager, and one control leading to
onboarding. **It shows a practice's size and never its contents**: no patient
count, no named staff member, nothing clinical. That boundary is the reason
`GET /api/v1/platform/organizations` is a purpose-built route rather than anything
reused from the org slice, and the screen renders exactly what it answers. A
footnote on the page says so in words, because a new administrator has not read
`PRODUCT.md`.

**The row keeps what the design review was buying and pays off the cost it
recorded.** §5 chose two-line rows over an aligned table and wrote down what that
costs: the counts sit at a different horizontal position in every row, so "which of
these is the big one" means reading each row rather than looking down a column. The
rows here are single-line and aligned, and they keep the review's own devices — the
status on a **3px leading edge** rather than in a column, the plan on a **pill**
beside the name, and a closed practice that **recedes** rather than shouting,
because it is the row nobody has to act on and `PRODUCT.md` is explicit that it is
not an error state.

**The second line went with the columns**, and that is the reason: it read
`2 branches · 6 staff · onboarded 1 Mar 2026` beside columns saying `2`, `6` and
`1 Mar 2026` — the same sentence twice, costing a line of every row on the screen.

**Every figure is mono and every count carries a bar.** The mono rule already
existed for codes; a figure is the same kind of thing — something compared down a
column or read back over the phone. The bars are drawn against the **biggest
practice on the page**, never against a limit: the list response carries no
allowance of any kind, so a capacity meter here would be measuring a number nobody
sent. The real one is on the practice screen.

**The URL is the state** (§6). `?name=`, `?page=` and `?size=` are query
parameters, so a search is shareable into a support thread and the back button
undoes it. Every control on the screen changes the address and nothing else; one
effect turns the address into the one call. A control that reached the service
directly would be a second source of truth, and the one the back button does not
reach. A `?size=` the screen does not offer is ignored rather than forwarded — the
route caps at 100 and would refuse it, and a screen that passes on whatever is in
the address turns a typo into a failure nothing explains.

**The toolbar is what narrows the board and what the board holds.** The field takes
one thing, the name, because that is all `listOrganizations` filters by. Beside it:
the count, and **rows per page** — which is a real control, not a preference, since
`size` is a parameter of the route. Somebody checking one practice wants a short
page and somebody auditing the platform wants the long one.

**`/` puts the cursor in the search box** from anywhere on the screen, and the field
wears the key so it is discoverable rather than folklore. It is ignored while the
reader is typing into something — otherwise `/` would be the one character the
search box could not hold — and while a modifier is down, so it never competes with
a browser shortcut. Escape clears a search that has one and blurs otherwise.

**The list, the practice and the edit form get `.stage--full`, not the form
gutter.** 60rem is a measure for reading a form, which is why onboarding keeps it. A
list and a record are the opposite — their job is to show as much at once as the
screen holds — and the header band above them already runs edge to edge, so a capped
one reads as a screen that failed to load rather than one that fits. Inside it the
columns are proportional rather than fixed, because a name column given `1fr`
against fixed ones takes every spare pixel and strands the figures against the right
edge.

**One part of the agreed design is still not built**: §6.1's **filter pills**, which
are the bulk of the search design — it parses `trial`, `basic` and `read-only` out
of the field into removable pills, and the route takes `name` alone while the status
enum has neither TRIAL nor READ-ONLY. The **seat meter** and the **disclosure
chevron** were also missing and are not any more; both needed the practice screen
below.

## `/practices/:id` — one practice

A row in the list opens it. It carries what the list could not: the **seat and
branch meters** design §5 wanted on the row, which need `seatLimit`/`seatsUsed` from
a subscription and are in `getOrganizationById` rather than in the list response;
both statuses, the practice's own and its **billing** one, which
`LLD-ORGANIZATION.md` §1 keeps deliberately apart and which are allowed to disagree;
and every branch, active and inactive.

**It is the one screen that does not use `app-page-header`.** That component takes
the `h1` from the route's title so the tab and the heading cannot disagree, and a
route cannot know a practice's name before the call that fetches it. The route title
is the constant `Practice`, which the tab reads; the `h1` is the practice, and it
carries its own `tabindex="-1"` because the frame focuses `main h1` after every
navigation.

**The branch count is smaller than the branch list, and the screen says why.** §2.8:
the usage figures count active rows only, while the list carries every branch. So a
practice with three branches of which one is closed reads `2 of 5` above a list of
three — which reads exactly like a defect, and gets reported as one unless the screen
says otherwise.

## `/practices/:id/edit` — the form that saves the name

**Read `PracticeEdit`'s class note before touching this.** The form shows three
fields and the platform API covers one of them:

```
name     PATCH /api/v1/platform/organizations/{id}   updateOrganizationFromPlatform
status   three transition routes, which this screen does not call
plan     no route at all — nothing changes a practice's plan
```

**So the submit is enabled by a change to the name.** A change to the plan or the
status disables it instead, with a note naming the field and a control that puts it
back without undoing the name. `PracticeUpdate` in `data/` owns the call, and it
builds the request one member at a time: the generated `UpdateOrganizationRequest`
carries `status` as an optional member, so `{ name, status }` compiles and is 422
`EPM-ORG-007` at runtime.

**A button that looked like it saved would be the worst thing on this screen**, and
that was true when nothing could be saved and is still true now that something can.
A platform administrator who believes they have suspended a practice — on a product
where suspension is a billing and access decision — has been told something untrue
about a real customer. A save that sent the name and quietly dropped the status
would be exactly that, with the button working. It is why a half-saveable form
refuses rather than doing its half.

**The response is the practice.** The PATCH replies with the same body
`getOrganizationById` does, so `Practice.accept` puts it straight into what the
screen is holding — no second read, and the fields, the comparison panel and the
dirty tracking all come back into step in one move. It also means the name read back
after a save is the server's record rather than the field the reader typed into.

**There is no idempotency key,** unlike onboarding, and that is not an oversight: a
repeated `POST` there creates a second practice, while this sets a name to a value,
so the retry after a timeout that the unreachable message suggests really is safe.

**Wiring the status is a separate decision, not a fourth call.** It is three routes,
one per transition, each with its own precondition — a transition that is not
allowed from the current status is 422 `EPM-ORG-013`, carrying `from` and `to`;
repeating one is that error rather than a quiet success, and `CLOSED` is terminal.
The question that has to be answered first is what a form editing a name and a
status _together_ does when the first call succeeds and the second is refused. F1 §7
item 1e owns it.

It was blocked for the whole of F1 — the milestone's §5 is the argument for the
route — and unblocked itself the day `listOrganizations` appeared in the generated
client (`LLD-ORGANIZATION.md` §2.8). Until then the console could not answer "does
this practice already exist", and the way to find out was to create a second one.

**There is still no navigation band.** Two screens are a place and the task opened
from it: the list carries the control that opens onboarding, and the wordmark is the
way back from anywhere. A band of two entries, one of which is always where you
already are, is chrome that says nothing — see `console-layout.ts` for the two tab
strips that were tried and removed.

**Two filters in P-04's design are deliberately not built**: status and plan. The
route filters by name only, and a filter this console applied to the twenty-five
rows it happens to be holding would answer about the page rather than about the
platform. They are columns to read down until the route offers them.

## Onboarding is a progress flow

`/onboard` creates a whole organization — a practice, its branches, its staff — in
four steps down one page, ending in a review and the one call that makes all three.

**All four steps are on screen at once.** The current one is open; finished ones
collapse to a ticked line saying what is in them (`Cairo Physio · Standard`) with
an Edit affordance; the ones after are dim and locked until the steps above them
are finished. A progress bar counts steps that are **finished and reached** —
the staff step is complete with nobody in it, so counting completeness alone would
credit the reader for a step they had not seen.

**Three shapes were tried before this one, and the reasons are worth keeping.**
A list with an "Add a practice" button was wrong for a console that had no list
screen at the time, P-04 being blocked on a route nobody had agreed — the list
exists now, and it is a screen of its own rather than the top of this form. A
tabbed builder replaced it and
gave random access with no sense of progress — it never said where you were or
what was left, and **tabs hide fields from the errors that name them** (P-05.7 maps
each server error code to its field). One flat form fixed the hiding and lost the
guidance: a practice, its branches and its staff on one undivided page is a wall.
This keeps both — always one next thing to do, and nothing hidden behind a click
that cannot be opened in place.

**The steps are not routes.** Four addresses for one form put four entries in the
browser's history, where Back would mean "undo one step of a form I have not
submitted" — which it does not.

**After a practice is created**, the screen is replaced by what was created, with
every id the server issued and one control to start another. P-05.8 says to go to
the practice list instead, and that is worth doing now the list exists — but the
receipt carries ids that are on no other screen, so it is a change with a decision
in it rather than a redirect.

**`OrganizationDraft` is the thing being built**, and all four steps are views of
it. Staff hold their branches **by key**, and array positions are computed once, in
`onboardRequestFrom` (`data/onboard-request.ts`) — see the class note and
`organization-draft.spec.ts`. That is the defect `LLD-ORGANIZATION.md` calls the
most likely to ship, and it fails silently.

**The idempotency key lives in `data/onboarding.ts`**, claimed on the first submit,
reused by every retry of that practice, and dropped only when a new practice is
started. A key regenerated on retry creates a second practice, and nothing on
screen would say so.

**Nothing on this screen is a list this repository keeps.** Plans come from
`listPlans` and roles from the generated enum; the placeholder
`organization-vocabulary.ts` was deleted with T-64. The one list still missing a
route is the speciality codes, which is why that control is a free-text field —
reported rather than invented (T-64 §10).

## Two things specific to this console

**It is English-only and LTR-only, permanently.** Nothing here reads the language
service — which is also why the onboarding screen words its own server failures in
`data/error-messages.ts` rather than reusing `ui`'s `ErrorMessage`, whose wording
resolves through the translations. There is no translation pipe in any template,
and the workspace's
direction lint rules are switched off for `projects/platform` in
`stylelint.config.mjs`. That override is where the decision to add Arabic would
get made.

**The vocabulary on screen is the product's, never the schema's.** Say practice,
not organization or tenant; branch, not clinic or site; "Add a branch", not
"Append a clinic". The folder is called `organizations` because that is the
milestone's structure and the API's noun - the words a user reads are not. The one
place the schema's noun surfaced was the primary action, "Create organization" —
and T-64 took even that away. It reads "Create practice" now, because a platform
administrator pressing it is creating a practice, and the one word on screen that
said otherwise was the schema's rather than theirs.

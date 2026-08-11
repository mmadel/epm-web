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

`components/` and `data/` do not exist yet. The one screen has nothing it shares
with a second one, and nothing calls the API until P-05.

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

## The console is one screen: a progress flow

**There is no landing screen and no navigation.** `/` redirects to `/onboard`,
which creates a whole organization — a practice, its branches, its staff — in four
steps down one page, ending in a review and the one call that makes all three.

**All four steps are on screen at once.** The current one is open; finished ones
collapse to a ticked line saying what is in them (`Cairo Physio · Standard`) with
an Edit affordance; the ones after are dim and locked until the steps above them
are finished. A progress bar counts steps that are **finished and reached** —
the staff step is complete with nobody in it, so counting completeness alone would
credit the reader for a step they had not seen.

**Three shapes were tried before this one, and the reasons are worth keeping.**
A list with an "Add a practice" button was wrong for a console whose list screen
(P-04) is blocked on a route nobody has agreed. A tabbed builder replaced it and
gave random access with no sense of progress — it never said where you were or
what was left, and **tabs hide fields from the errors that name them** (P-05.7 maps
each server error code to its field). One flat form fixed the hiding and lost the
guidance: a practice, its branches and its staff on one undivided page is a wall.
This keeps both — always one next thing to do, and nothing hidden behind a click
that cannot be opened in place.

**The steps are not routes.** Four addresses for one form put four entries in the
browser's history, where Back would mean "undo one step of a form I have not
submitted" — which it does not.

**When P-04 unblocks**, `/practices` becomes the home and `/onboard` becomes a task
opened from it — a change to `route-paths.ts` and one redirect.

**`OrganizationDraft` is the thing being built**, and all four steps are views of
it. Staff hold their branches **by key**, and array positions are computed once, in
`request()` — see the class note and `organization-draft.spec.ts`. That is the
defect `LLD-ORGANIZATION.md` calls the most likely to ship, and it fails silently.

**What is not built yet:** submission. The call, the idempotency key, the in-flight
state and the error-code mapping are P-05.5 to P-05.7, all specified in
`LLD-ORGANIZATION.md` §2.1. The plan and role values in `organization-vocabulary.ts`
are placeholders, marked as such in the file and on screen.

## Two things specific to this console

**It is English-only and LTR-only, permanently.** Nothing here reads the language
service, there is no translation pipe in any template, and the workspace's
direction lint rules are switched off for `projects/platform` in
`stylelint.config.mjs`. That override is where the decision to add Arabic would
get made.

**The vocabulary on screen is the product's, never the schema's.** Say practice,
not organization or tenant; branch, not clinic or site; "Add a branch", not
"Append a clinic". The folder is called `organizations` because that is the
milestone's structure and the API's noun - the words a user reads are not. The one
place the schema's noun surfaces is the primary action, "Create organization",
because that is the single call being made and naming it after one of its three
parts would understate it.

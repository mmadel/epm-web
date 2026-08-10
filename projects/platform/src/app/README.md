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
      pages/                 routed components
      components/            used only by this feature
      data/                  the only place that touches api-client
```

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

## Two things specific to this console

**It is English-only and LTR-only, permanently.** Nothing here reads the language
service, there is no translation pipe in any template, and the workspace's
direction lint rules are switched off for `projects/platform` in
`stylelint.config.mjs`. That override is where the decision to add Arabic would
get made.

**The vocabulary on screen is the product's, never the schema's.** Say practice,
not organization or tenant; branch, not clinic or site; "Add a practice", not
"Onboard an organization". The folder is called `organizations` because that is
the milestone's structure and the API's noun - the words a user reads are not.

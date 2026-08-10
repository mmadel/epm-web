# Milestone F0 — Frontend groundwork

**Repo:** `epm-web`
**For:** frontend tech lead and engineers
**Status:** Phase 1 ready · Phase 2 ready

Everything here is buildable **before the API exists**. Nothing in this milestone calls the
server, and nothing in it depends on a decision that has not been made.

Organization screens are **F1**, not F0. They need a contract to build against, so they wait
for the OpenAPI specification — see _What comes next_.

**Depends on:** `LLD.md` §3 tenancy, §7 errors, §11 API documentation, §12 client
foundations; `LLD-ORGANIZATION.md` §2.1 for the error code list.

Where this document and `LLD.md` disagree, `LLD.md` wins.

---

# Workspace

Angular 22 multi-application workspace. Node 24.15.0, pinned in `.nvmrc`.

```
epm-web/
  projects/
    staff/        application — doctor, receptionist, org admin. Desktop console
    patient/      application — empty and undesigned. Do not build here
    api-client/   library — generated OpenAPI client. Empty until a spec exists
    core/         library — configuration, language, session, HTTP plumbing
    ui/           library — tokens, shell, error display, form primitives
```

**Nothing in `ui` or `core` may be staff-specific.** The patient app will use all of it.

## Facts that constrain every ticket

**The patient app will run inside Capacitor**, from a `capacitor://` origin. No code
anywhere may assume same-origin. This is why the API base URL is configuration and why
relative API paths are a build failure rather than a review comment.

**Arabic and English are both first-class.** Arabic is right to left. Direction is a
property of the whole product, not a style applied to some screens.

**The client never sends an organization id.** The server derives it from the caller.
There is nowhere in the API to put one (`LLD.md` §3).

**Types are generated, never written** (`LLD.md` §12). This is why no screen appears in this
milestone.

## Why this milestone exists

The backend is mid-M1 and no OpenAPI specification is generated yet (`LLD.md` §13, item 4).

The risk that creates is not idle engineers. It is engineers building screens, needing
types, hand-writing interfaces that mirror server responses, and then either rewriting them
or letting them drift silently.

F0 is therefore scoped to the things that are true regardless of what the API turns out to
look like — and, specifically, the things that get **more expensive the longer they wait**.
Retrofit Arabic after seven screens exist and you rewrite seven screens.

---

# Phases

| Phase           | Contains                                          | Depends on     |
| --------------- | ------------------------------------------------- | -------------- |
| 1 — Setup       | Tooling, CI, environment configuration            | —              |
| 2 — Foundations | Language, direction, tokens, shell, error display | Phase 1 merged |

Phase 2 is named "foundations" rather than "theme" because the error component is plumbing
that happens to be visual. What the phase contains is everything a screen will depend on.

---

# Phase 1 — Setup

## F-00 — Tooling baseline

`f/F-00-tooling`

### F-00.1 Lint and format

ESLint (Angular ESLint) and Prettier at the workspace root, applied to every project. One
config, no per-project overrides.

### F-00.2 Pre-commit hook

Runs lint and format check before a commit is accepted.

### F-00.3 CI workflow

GitHub Actions running lint, build, and test for every project on every PR.

### F-00.4 Rule — relative API paths fail the build

Any string literal matching `/api/` used as an HttpClient or fetch URL is an error.

The patient app runs from a custom-scheme origin where relative paths resolve to nothing,
and the failure is silent at runtime. The base URL comes from configuration — F-01.

### F-00.5 Rule — cross-application imports fail the build

`projects/staff` may not import from `projects/patient`, and vice versa. Neither may reach
into another app's internals.

### F-00.6 Rule — direction-specific layout properties fail the build

`margin-left`, `padding-right`, `left:`, `right:`, and `text-align: left|right` in any
`.scss` file are errors. Use logical properties — `margin-inline-start`, `text-align: start`.

A mirrored right-to-left stylesheet is a second place every layout rule lives. They drift,
and the Arabic version quietly becomes the worse one. This rule exists in Phase 1 so Phase 2
does not have to retrofit it.

### F-00.7 Verification

Commit a deliberate violation of each of the three rules on a scratch branch, confirm CI is
red, then remove them. **A rule that only warns is a rule nobody follows.**

### Done when

- Each of the three rules demonstrably fails CI
- `lint`, `build`, and `test` are green from a clean checkout, both applications
- Both applications still serve

---

## F-01 — Environment configuration

`f/F-01-environment`

### F-01.1 Injection token

The API base URL is exposed through an injection token in `projects/core`. Components never
import an environment file directly.

### F-01.2 Both applications consume it

`staff` and `patient` read from the same token. They point at the same API but are built and
deployed separately.

### F-01.3 Fail at build time

A build with no base URL configured fails, with a message naming what is missing.

An application that starts and then 404s on its first request is worse than one that refuses
to build.

### Done when

- A build with the value removed fails, and the message names the missing value
- A test asserts the token is provided
- Nothing in either application references an environment file directly

---

# Phase 2 — Foundations

## F-02 — Language and direction

`f/F-02-i18n`

One build serves both languages, switched at runtime (`LLD.md` §12). Not two builds, not a
separate Arabic bundle.

### F-02.1 Language service

A service in `projects/core` holding the active language as a signal. Two values: `en` and
`ar`. One method to change it. Nothing else reads or writes the language directly.

### F-02.2 Document attributes

Changing the language sets `dir` on the document element to `ltr` or `rtl`, and `lang` to
`en` or `ar`. **Both change together, in one place.** Never one without the other.

### F-02.3 Translation file structure

Files split by feature area, not one flat file. Establish the folder convention and a key
naming pattern. Two files per area, `en` and `ar`.

### F-02.4 Loading and lookup

A pipe or function components use to resolve a key.

A missing key renders the key itself, visibly, and logs it. **Never an empty string** — a
blank label is invisible in review and ships.

### F-02.5 Content — English in both files

Put English text in the `ar` files as well as the `en` files.

Clinical Arabic needs a clinician's sign-off and that person has not been identified
(`PRODUCT.md`, open questions). A visible gap is correct. **Do not machine-translate.** Add
a README in the translations folder recording that the `ar` files are placeholders.

### F-02.6 Persistence

The chosen language survives a reload. Default when nothing is stored: English.

### F-02.7 Tests

- Switching flips text and direction with no reload
- `dir` and `lang` always change together
- A missing key renders the key and logs
- Reload keeps the choice

---

## F-03 — Design tokens and application shell

`f/F-03-tokens-shell`

Tokens first. The shell consumes them — that is the proof they work.

### F-03.1 Colour tokens

`surface`, `text`, `border`, `primary`, `danger`, and a muted/disabled pair. SCSS custom
properties in `projects/ui`.

**Named by role, not by value.** `--color-danger`, never `--color-red`.

### F-03.2 Spacing scale

One scale, used everywhere. Small enough that picking a value is obvious rather than a
decision.

### F-03.3 Typography scale

Size steps, weights, and line heights for Latin.

### F-03.4 Arabic typography

Choose and document an Arabic font stack. **Not the Latin stack with a font swapped in.**

Arabic needs more line height than Latin at the same size. Override per language, driven by
the `lang` attribute from F-02.2.

### F-03.5 Numerals — raise, do not decide

Western (1,2,3) or Eastern Arabic (١,٢,٣) in the Arabic UI?

The standard differs between Egypt and parts of the Gulf, and this affects how every
clinical reading is displayed. **This is a product decision.** Report it and wait rather
than choosing.

### F-03.6 Application shell

Header, side navigation, content area. Navigation on the **start** side, not the left side.
Language switch control in the header.

Responsive down to tablet. Desktop-first — the patient app is a separate design problem and
out of scope.

### F-03.7 Direction verification

Render the shell in both directions and check by eye. Screenshot both into the PR.

### F-03.8 Enforcement

No hardcoded colour or pixel spacing value in any component. Add the lint rule if F-00.6 did
not already cover it.

---

## F-04 — Error display component

`f/F-04-errors`

One component. Every screen in F1 uses it. **Nothing else in the codebase interprets an
error body** (`LLD.md` §7).

Server error shape:

```json
{
  "type": "https://errors.epm/EPM-ORG-006",
  "title": "Seat limit exceeded",
  "status": 422,
  "code": "EPM-ORG-006",
  "traceId": "...",
  "limit": 5,
  "requested": 7
}
```

### F-04.1 Problem+json type

A TypeScript type for the standard fields. Extra fields are arbitrary and typed loosely —
they vary per code.

### F-04.2 Code to translation key registry

One map, code to key. Codes are stable forever and are never reworded or renumbered
(`LLD.md` §7). Adding a server code means adding one row here and two translation strings.

### F-04.3 Message component

Takes a problem+json body, renders a localised message.

`title` is written for a developer reading logs. **It is never rendered.** `traceId` is
logged, never displayed.

### F-04.4 Field interpolation

Extra fields are the message's inputs. `EPM-ORG-006` carries `limit` and `requested` and
the message names **both** numbers. `EPM-ORG-008` carries `limit`.

### F-04.5 Unknown code fallback

Renders a generic localised message and logs the code. Never a blank screen, never raw JSON,
never the raw code shown to a user.

**A new server code must not break an older client.** This subtask is what guarantees it.

### F-04.6 Fixtures

One fixture per code. **No network calls anywhere in this ticket** — these codes are already
specified in `LLD-ORGANIZATION.md` §2.1 and are stable, which is why this ticket can be
built before the API is.

| Code          | Status | Meaning                                                    |
| ------------- | ------ | ---------------------------------------------------------- |
| `EPM-REQ-001` | 400    | Malformed request                                          |
| `EPM-REQ-002` | 400    | Unknown role value                                         |
| `EPM-REQ-003` | 400    | `Idempotency-Key` header missing                           |
| `EPM-ORG-001` | 400    | Clinic position out of range                               |
| `EPM-ORG-002` | 409    | Duplicate branch name                                      |
| `EPM-ORG-003` | 409    | Duplicate email                                            |
| `EPM-ORG-004` | 422    | Unknown plan                                               |
| `EPM-ORG-005` | 422    | Unknown speciality code                                    |
| `EPM-ORG-006` | 422    | More staff than seats allow — carries `limit`, `requested` |
| `EPM-ORG-007` | 422    | Organization status is not settable by a client            |
| `EPM-ORG-008` | 422    | Branch limit exceeded — carries `limit`                    |
| `EPM-ORG-009` | 422    | Cannot deactivate the only active branch                   |
| `EPM-ORG-010` | 422    | Cannot remove the last active org admin                    |
| `EPM-ORG-011` | 422    | A staff member needs at least one branch                   |

### F-04.7 Tests

- Every code renders, in both languages
- An unknown code renders the generic message and logs
- `title` never reaches the DOM
- `EPM-ORG-006` renders both numbers

**`EPM-ORG-006` is the one worth getting right.** The message names both numbers and offers
the two real options: add a seat, or change plan (`PRODUCT.md`). It is the error a growing
practice hits most often.

---

# Hard rules

| Never                                                      | Because                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Hand-write a type that mirrors a server response           | `LLD.md` §12. Types are generated. Drift is found at runtime, by a user |
| Build a screen in this milestone                           | F0 is everything true regardless of the API. Screens are F1             |
| Decide whether a reading is normal, anywhere in the client | The server classifies against the doctor's target (`LLD.md` §12)        |
| Send an organization id                                    | There is nowhere for the server to accept one (`LLD.md` §3)             |
| Show a raw code, a `traceId`, or an English server message | F-04 owns all wording                                                   |
| Machine-translate clinical Arabic                          | It needs a clinician, not a translator                                  |
| Build anything in `projects/patient`                       | `PRODUCT.md` capability 8 has no design                                 |

---

# Definition of done

Per ticket:

- Tests fail without the code
- Lint and build green from a clean checkout
- **One commit per subtask.** One branch and one PR per ticket, with the done-list ticked
- Any deviation from `LLD.md` raised **before** the code is written, not explained after

Do not add a component library, state management, HTTP interceptors, or auth. Those carry
architectural decisions that have not been made. Build only the primitives these tickets
name — components designed before their first real use are guesses.

---

# What comes next

**F1 — Organization screens.** The org slice from `LLD-ORGANIZATION.md` §2.2 to §2.7:
practice overview, branches, staff, roles, assignments, subscription. Not written yet.

F1 needs one of two things first:

1. **The OpenAPI specification exists**, and `api-client` is generated from it. This is the
   clean path
2. **Or** a single transcribed contract file, marked temporary and deleted the day
   generation lands, so screens can be built against the LLD in the meantime

Path 2 is a compromise with a real cost and should only be taken if the specification is
genuinely far off. Do not start it without agreement.

**Onboarding (`LLD-ORGANIZATION.md` §2.1) belongs to neither yet.** It is an internal
platform console — English only, no RTL, a user who must never see patient data. Whether it
lives in `staff` or in a third application is undecided.

---

# Decisions recorded here

| Decision                                     | Rejected                                         | Reason                                                                                                       |
| -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| F0 contains no screens                       | Building organization screens against a mock now | Screens need a contract. Building against a transcription risks hand-written types that `LLD.md` §12 forbids |
| Two applications in one workspace            | One app with role-switched routes                | The patient's phone would ship the entire staff surface, under different bundle and offline constraints      |
| Two applications in one workspace            | Two repositories                                 | The generated client, error mapping, and translations would exist twice and drift                            |
| Direction rules enforced by lint in Phase 1  | Review, or a Phase 2 cleanup                     | Retrofitting RTL after screens exist means rewriting every screen                                            |
| English placed in the `ar` translation files | Machine translation, or empty files              | Clinical Arabic needs a clinician. An empty string is invisible in review                                    |

---

# Blocking, owned elsewhere

| #   | Item                                                          | Blocks                           | Owner        |
| --- | ------------------------------------------------------------- | -------------------------------- | ------------ |
| 1   | Nothing generates an OpenAPI specification (`LLD.md` §13.4)   | **All of F1**                    | Backend lead |
| 2   | Nx adoption for module boundary enforcement                   | F-00.5                           | Architecture |
| 3   | Arabic numerals — Western or Eastern                          | F-03.5                           | Product      |
| 4   | Bearer tokens vs cookie sessions                              | Auth, whenever it starts         | Architecture |
| 5   | Separate identity realm for patients                          | `core` shape                     | Architecture |
| 6   | Who writes the clinical Arabic                                | F-02.5 content, not structure    | Product      |
| 7   | Patient app has no product design (`PRODUCT.md` capability 8) | Everything in `projects/patient` | Product      |

**Item 1 is the critical path.** F0 is roughly two engineers for a fortnight. It does not
absorb five people, and it does not absorb them for long. The specification is what unblocks
the rest of the team.

**Items 2 and 3 are gates, not tasks.** F-00.5 should not start until the Nx decision lands,
and F-03.5 stops and reports rather than choosing.

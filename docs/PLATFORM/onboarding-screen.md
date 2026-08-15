# The onboarding screen

The platform console has one screen: `/onboard`, which creates a practice, its branches
and its staff in a single call. This document records **how that screen is built and why
it looks the way it does** — the patterns it established, the rules those patterns
follow, and the things that were tried and taken out again.

It is the companion to `docs/design-tokens.md`. That file says what the values are; this
one says what this screen does with them. Neither is a style guide for the product: the
staff and patient applications share the tokens and share nothing else here.

`docs/tickets/T-64.md` is the contract — what the screen must do, which routes it calls
and which error codes land where. **Where this document and the ticket disagree about
behaviour, the ticket wins.** Where they disagree about appearance, this one is the
record of what was built.

## The shape of it

One page, four steps, always all four on screen. A finished step collapses to a line
that says what is in it; exactly one step is open at a time; nothing is behind a click
that cannot be opened in place. The reasoning — and the two shapes that were thrown away
to get here, a tab strip and one flat form — is in the class comment on `OnboardPractice`.

```
┌─ progress ──────────────────────────────────────────────┐
│ ①━━━━━━━②━━━━━━━③━━━━━━━④              2 of 4 done      │
└──────────────────────────────────────────────────────────┘

✓ Practice   Cairo Physiotherapy Centre · Practice   [✎ Edit] ┐
✓ Branches   3 · Maadi, Zamalek, Heliopolis          [✎ Edit] │  ┌──────────┐
② Staff                                                       │  │  Will be │
  ┌────────────────────────────────────────────────┐          │  │  created │
  │ ▍ the open step is a card with an accent edge  │          │  │  (panel) │
  └────────────────────────────────────────────────┘          │  └──────────┘
④ Review and create                                          ┘
```

The right column is the readiness panel. It is **not rendered on step 4**: the review
says everything the panel says and more, immediately to its left, and a panel that
repeats its neighbour teaches a reader to stop reading. The grid drops the column rather
than emptying it, so the review gets the whole width.

Once the call succeeds the whole form is replaced by the receipt. It is not left on
screen behind it: a filled form beside a success panel is an invitation to press create
again, which is the one thing this screen must not make easy.

## What owns what

| Component         | What it is                                                         |
| ----------------- | ------------------------------------------------------------------ |
| `OnboardPractice` | The page: the four steps, the flow between them, and the submit.   |
| `Step`            | One step — its marker, its collapsed summary, its panel.           |
| `PlanChoice`      | The plan, as a card per plan. Owns its loading, failure and retry. |
| `Dialog`          | A modal `<dialog>` with a heading and a way out. Projects a form.  |
| `BranchForm`      | Name and phone. Only ever shown inside the dialog.                 |
| `StaffForm`       | Name, email, speciality, roles, branches. Dialog only.             |
| `Review`          | The whole draft read back: tiles, two trees, and the statement.    |
| `Ledger`          | The readiness panel: what is being made, and what is still needed. |
| `CreatedPanel`    | The receipt, with every id the server issued.                      |

Two files hold no markup and are worth knowing about:

- **`organization-draft.ts`** — the draft itself. The whole console is this one object;
  the four steps are four views of it. It holds keys and knows nothing about how any of
  it is worded.
- **`organization-summary.ts`** — the derivations: who works at a branch, which branches
  a person covers, a count against a plan's limit. They are here rather than on the page
  because the steps' lists and the review ask the same questions, and two copies of
  "which branches does this person work at" is two answers waiting to differ.

## The rules

### Depth is tonal, and there is no shadow

The console's only depth cue is the step between a white band (`--color-surface-raised`)
and the tinted canvas (`--color-surface`). **This is enforced**: Stylelint rejects
`box-shadow` and `text-shadow` anywhere under `projects/platform`, with a message saying
why. A shadow added to one component would match nothing around it.

The same step is used **inverted** for a tile inside a card: the review's four tiles, the
readiness panel's two counts and the review's headline facts are set on the canvas colour
inside a white step. It costs no shadow and no second border weight.

The modal dialog is the one element that cannot use it — it floats over everything rather
than sitting on anything. It is separated by its border and by a backdrop mixed from the
ink with `color-mix`, which composes the palette rather than spelling a colour out.

### An action is filled and squared; a chip is outlined and rounded

This replaced an earlier rule that the primary action was **the only pill in the content
area**. The shape was never what set an action apart — the **fill** is, because nothing
else in a step is filled in the accent. The pill only made the one control a reader was
heading for look smaller and softer than the cards and fields around it.

| Control                      | Shape                              | Size           |
| ---------------------------- | ---------------------------------- | -------------- |
| `Create practice`            | filled, `0.5rem` radius            | `3rem` tall    |
| `Continue`, `Create another` | filled, `0.5rem` radius, `→` glyph | `2.5rem` tall  |
| `Add branch` (in a form)     | filled, `0.5rem` radius            | `2.25rem` tall |
| `+` (adds a row to a list)   | filled, **circle**                 | `2rem`         |
| `Edit`, `Copy`, dialog close | outlined, rounded                  | small          |

The circular `+` is the one deliberate exception, and it is exempt from the second half
of the rule rather than the first. The rule is about **worded** controls, where shape is
all that separates a thing you press from a thing that reports a state. A lone glyph has
no label to square off around, and a circle is the shape a single mark sits in — the same
circle the step markers, the row numbers and the receipt's tick already use. It stays
filled, which is the half that carries "this is an action".

Sizes are set with `min-block-size` rather than block padding: the label is one line, so
padding alone would put the height at the mercy of the reader's font size.

### The icon vocabulary

Five marks, and each means exactly one thing everywhere it appears.

| Mark            | Means        | Where it is drawn                                           |
| --------------- | ------------ | ----------------------------------------------------------- |
| Clinic building | The practice | Practice name field, review tile                            |
| Location pin    | A branch     | Branches step, branch name field, review tile and tree head |
| Two people      | Staff        | Staff step, review tile and tree head, readiness panel      |
| Card            | The plan     | Review tile                                                 |
| Pulse trace     | The product  | The wordmark, and the practice step's own heading           |

**A branch is a pin and not a building.** A building already means the practice — a
branch is a _location of_ it — and one symbol with two meanings on one screen is worse
than no symbol. This was considered and settled; changing it means changing the branches
step, the branch form and the review together, and giving the practice a different mark.

A mark is never the only carrier of anything. Every state told in colour is told in a
shape and in words as well.

### Three list shapes, and when each is used

| Shape                        | Used for                                  | Defined in    |
| ---------------------------- | ----------------------------------------- | ------------- |
| `.entries` / `.entry`        | A plain list of things added              | `styles.scss` |
| `.grid-list` (named columns) | Rows with fields to compare down a column | `styles.scss` |
| `.tree` (`<details>`)        | Rows with children — an assignment        | `review.scss` |

The branch and staff steps use `.grid-list`. A branch has four facts and they used to run
together on one line, so "which of these has no phone" was answered by reading every row
instead of by looking down one column. The head and the rows are **two separate grids
given one template** through a `--grid-list-columns` custom property, which the list sets
for itself — the proportions belong to what is in the columns.

> **The first and last columns must be fixed widths, not `auto`.** `auto` sizes to the
> content of its own grid, so an empty header cell measures `0` where a row's four icon
> buttons measure seven rem, and every `fr` column after it lands somewhere different.
> The headings then sit off to the side of the values they name, which is worse than
> having no headings at all.

The review uses trees, one per direction: a branch with its people under it, and a person
with their branches under them. A node with nothing under it is **not** a disclosure — an
unstaffed branch gets a plain row and a leaf dot rather than a twisty that opens onto
nothing. Every node starts open, because this is the screen before something irreversible
and nothing it is a reader's job to check is put behind a press.

Column headings are `aria-hidden`. A row already reads as "Maadi, +20 2 2358 1100, Mona
Hassan" and each control names the branch it acts on, so the association a real `<table>`
would carry is in the content; a heading row announced on top of it is four more words
before the first branch.

### Forms open in a modal `<dialog>`

Adding a branch used to open a form in the list, in place of the control that opened it:
the list rearranged itself around the thing being typed, the row being edited disappeared
while it was edited, and only one form could be open at a time for reasons nothing on
screen explained.

It is the **native `<dialog>`, opened with `showModal()`** — the browser gives modality, a
backdrop, focus held inside, Escape to dismiss and inert content behind it. A hand-built
overlay gets three of those subtly wrong, and they are the three that are invisible to
anybody testing with a mouse.

Three things about it are load-bearing:

- **It is rendered by `@if`, not kept in the DOM and toggled.** `showModal()` runs once,
  on the render that creates it, so "closed" is "not rendered" and there is no second
  flag to disagree with the first.
- **The caller returns focus.** A modal holds focus; closing it removes the focused
  element from the document and focus falls back to `<body>`. `closeBranchForm()` and
  `closeStaffForm()` put it back on the `+` that opened it.
- **The dialog restores an aimed-at control.** A server fault names a control and the page
  focuses it on the same render that opens the dialog — the page's callback runs first,
  then `showModal()` throws that focus away. The dialog records what was deliberately
  focused before opening and restores it after, falling back to the first field.

### A count is a loud number and a quiet unit

Every count on the screen is set the same way: the number at body size and bold, the word
beside it quiet, and `font-variant-numeric: tabular-nums` throughout so a figure changing
in place does not make the word beside it twitch.

### Over the plan warns and never blocks

The plan's seat and branch limits come from `listPlans`. Three places count against them —
the steps that own each list, the readiness panel, and the review — and **all three tint
the same way**, with the danger surface, and none of them disables anything.

The server owns the limit and answers `EPM-ORG-006` if it disagrees. A console that
refused at a number the server would have accepted is a form nobody can send for a reason
nobody can see. The review says so in words: _"It can still be created — the server
decides, and it may refuse."_

The tint is the danger surface rather than the amber warning triple, and that is a
deliberate settling: the counters have used it since before the review existed, and one
condition drawn in two tones on one screen reads as two conditions.

### There is one definition of "finished"

`OrganizationDraft` exposes `practiceIsComplete`, `branchesAreComplete`,
`staffAreComplete` and `isComplete`. Every disabled button, every step's small print and
the readiness panel's three ticks read those signals. **Nothing restates the rules**: a
fourth definition of "is this finished" is a fourth thing to keep in step, and the one
that disagrees is always the one nobody looks at.

The panel's wording says what each rule actually checks. "At least one branch" alone would
tick while a branch sat there unnamed, so it reads "At least one branch, each named".

An outstanding rule is an **open circle, not a cross**. A cross says something is wrong;
a rule not yet met on a form being filled in is not wrong, it is not done.

### Nothing is invented that the server did not send

The plan cards carry a name and the two limits `listPlans` returns, and nothing else.
Cards were removed once for carrying a sentence per plan that nobody had written, and
that reason still binds: **if the API ever sends a description, that is when a card gets
one.** When the route fails there is a retry and no cards at all — a fallback list is how
a practice ends up on a plan that does not exist.

The receipt shows every id and truncates none of them. An id with its middle removed
cannot be read out, typed into another system, or checked against what it was pasted
into, and reading it is what the row is for.

## Taken out, and why

Each of these left a comment where it used to be, so the reasoning is findable from the
place somebody would look for it.

| Gone                   | Why                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `.add-tile`            | A full-width dashed tile under the last row moved down the screen with every row added. It is a `+` at the head of the list now. |
| `.entry--editing`      | A row that turned into a form in place. Both lists open a dialog, so a row is never anything but a row.                          |
| The plan `<select>`    | Showed one plan at a time and said what it came with only after it had been chosen. Comparing two plans meant choosing both.     |
| `.step__lede`          | Only the review carried one, and what it said is now the sentence immediately above the button that does it.                     |
| `.entry__body`         | The one-line row body. The lists that used it have columns or a tree now.                                                        |
| The review's own facts | Two label/value rows became four tiles that also carry the counts and the plan's limits.                                         |

## Known state

Three component stylesheets sit over the `anyComponentStyle` **warning** budget of 4kB
(`review.scss`, `onboard-practice.scss`, `created-panel.scss`). The error threshold is
8kB and nothing is close to it. `onboard-practice.scss` was already over before this work
and came back down when the review moved into its own component; **that is the move to
repeat** if the page grows again — the last step to leave was the largest block in the
largest template in the console.

## If you change this screen

- Add a colour pair to a screen and add it to `tools/design-tokens/contrast.test.js`.
  Contrast is the one design property that is objectively decidable and completely
  invisible in a diff.
- Keep a state told twice. Colour, plus a shape or a word.
- Put a derivation over the draft in `organization-summary.ts`, not on a component.
- Check `npm run lint` before assuming a stylesheet is fine: the direction rules, the
  hardcoded-value rules and the no-shadow rule are all enforced, and every message names
  what to use instead.

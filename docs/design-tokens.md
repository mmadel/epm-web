# Design tokens

Every colour, space and type value in the product comes from a token. The tokens are
CSS custom properties defined in one file, `projects/ui/styles/_tokens.scss`, and that
file is the only place in the workspace allowed to contain a raw colour value or a
pixel spacing value - Stylelint enforces both rules, and the error message names the
token to use instead.

## How an application gets them

The tokens ship inside the `ui` library rather than being copied into each
application, so there is one definition and no drift between the staff console and
the patient app.

The path has three pieces:

1. `projects/ui/ng-package.json` lists `./styles/**/*.scss` under `assets`, so
   `ng build ui` copies the folder verbatim to `dist/ui/styles/`.
2. Each application's build in `angular.json` sets
   `stylePreprocessorOptions.includePaths: ["dist"]`, which puts `dist` on the Sass
   load path.
3. The application's `styles.scss` contains one line: `@use 'ui/styles';`, which Sass
   resolves to `dist/ui/styles/_index.scss`.

This mirrors how TypeScript reaches the same library - `import { … } from 'ui'`
resolves to `dist/ui` through the root `tsconfig.json` `paths` - so both use the same
specifier, and both need the same build order: `npm run build:libs` before an
application compiles. A stale `dist/` is the one failure mode, and it is the failure
mode the workspace already has for TypeScript, rather than a new one.

The alternatives were considered and rejected:

- **Copying the tokens into each application.** Two definitions, guaranteed to drift.
- **Pointing `includePaths` at `projects/ui/styles` (the source).** It works without a
  library build, but then styles resolve from source while TypeScript resolves from
  `dist`, and an application could compile against a version of the library that was
  never built. One resolution model is worth the rebuild.

Proof that it actually lands in the shipped CSS, rather than being merely configured:

```bash
npm run build
grep -o -- '--color-[a-z-]*' dist/staff/browser/styles-*.css | sort -u
```

## Colour

Named by **role**, never by value. `--color-danger`, never `--color-red`. A reviewer
reading a call site cannot tell what hue a token is, which is the point: the hue can
change - a rebrand, a contrast fix, a dark theme - without any call site becoming a
lie, and nobody can reach for `--color-red` because they want a warning.

| Token                    | Role                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `--color-surface`        | The page itself.                                              |
| `--color-surface-raised` | Anything sitting on the page: header, side navigation, cards. |
| `--color-text`           | Body text.                                                    |
| `--color-text-inverse`   | Text on a filled `--color-primary` / `--color-danger` area.   |
| `--color-border`         | Separators, rules, control outlines.                          |
| `--color-primary`        | The action colour: active navigation, primary button, focus.  |
| `--color-primary-hover`  | The same role, hovered or pressed.                            |
| `--color-danger`         | Destructive actions and error states.                         |
| `--color-danger-hover`   | The same role, hovered or pressed.                            |
| `--color-muted-surface`  | A de-emphasised or disabled fill.                             |
| `--color-muted-text`     | Secondary text, and the label of a disabled control.          |
| `--color-subtle-text`    | A third step: metadata, a placeholder, a note under a line.   |
| `--color-border-soft`    | A separator inside a card, between its rows.                  |
| `--color-border-strong`  | An input's edge, an unselected chip.                          |
| `--color-primary-soft`   | A tinted area carrying accent content: an icon tile, avatar.  |
| `--color-primary-deep`   | Text and glyphs on `--color-primary-soft`.                    |

`--color-muted-surface` and `--color-muted-text` are a pair: the muted text colour is
legible both on the page and on the muted fill, so a disabled control can be built
from the two without checking anything. `--color-primary-soft` and
`--color-primary-deep` are a pair for the same reason - `--color-primary` on the soft
tint does not clear 4.5:1, and the deep step does.

### Chrome

The application frame - the header band and the navigation rail - is **a surface of
its own**, with the same roles the page has.

| Role                           | Meaning                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `--color-chrome-surface`       | The frame's fill: the header band, the navigation rail. |
| `--color-chrome-text`          | Text on the frame.                                      |
| `--color-chrome-muted-text`    | The second, quieter step of text on the frame.          |
| `--color-chrome-border`        | The frame's edge, and separators drawn inside it.       |
| `--color-chrome-hover-surface` | A navigation entry under the pointer.                   |
| `--color-chrome-accent`        | The accent **as it appears on the frame**.              |
| `--color-chrome-focus`         | The focus ring on the frame.                            |

These exist because `ui`'s shell used to draw the frame with `--color-surface-raised`
and `--color-text`, which quietly asserted that a frame is always the same lightness
as a card. The platform console wanted the opposite - an ink frame around light
content - and without these roles the only way to get it would have been a
per-application branch inside a shared component, which is the thing the whole token
system exists to prevent.

**`--color-chrome-accent` is separate from `--color-primary` on purpose**, and it is
the least obvious entry here. The page accent is capped by having to carry link text
at 4.5:1 on white; on a dark frame that same value is a 2.8:1 shape and simply sinks
into the band. One accent cannot be tuned against two surfaces of different lightness,
so there are two, and the frame's is only ever drawn on the frame. `--color-chrome-focus`
is separate for the same reason - a ring you cannot see is not a focus indicator.

A **filled** control inside the frame - the active navigation entry, the skip link -
stays on `--color-primary` with `--color-text-inverse` on it. It carries its own
contrast and reads on a frame of any lightness.

Every default reproduces the value that was hardcoded at its call site before the
roles existed, so the staff console renders identically and the roles cost nothing
until an application reassigns them.

### Status

Three tinted **triples**, added by F1 P-03 - the first ticket that actually rendered
one - rather than guessed at when the palette was written.

| Role    | Tint                      | Text                   | Mark                   |
| ------- | ------------------------- | ---------------------- | ---------------------- |
| Info    | `--color-info-surface`    | `--color-info-text`    | `--color-info-mark`    |
| Warning | `--color-warning-surface` | `--color-warning-text` | `--color-warning-mark` |
| Danger  | `--color-danger-surface`  | `--color-danger-text`  | `--color-danger-mark`  |

`-mark` is a **non-text** carrier: a dot, a leading edge, an icon. It only has to
reach 3:1, and it exists so that a status is never signalled by tint alone - the words
say it, the tint repeats it, and the mark repeats it again for a reader who separates
shapes more easily than hues.

`--color-danger` and `--color-danger-hover` are still the strong pair, for a filled
destructive control. `--color-danger-surface` is the tinted version, for an area that
has to stay readable underneath text. There is still no success role: nothing renders
one yet.

### Contrast is checked, not estimated

`tools/design-tokens/contrast.test.js` reads this file's values and fails if any pair
the product actually stacks drops below its floor - 4.5:1 for text, 3:1 for a mark. It
runs in CI as part of `npm run test:lint-rules`.

It exists because contrast is the one design property that is objectively decidable
and completely invisible in a diff: nobody reviewing `--color-warning-text: #a2711a`
can see that it fails on its own tint by half a point. That value did, which is why
the amber pair reads closer to bronze than an amber picked by eye would. **Adding a
new colour pair to a screen means adding it to that list**, otherwise it is not
covered.

## Theming one application

An application can reassign these roles for itself with one attribute on its
`<html>` element and one block in `_tokens.scss`:

```html
<html lang="en" data-app="platform"></html>
```

```scss
:root[data-app='platform'] {
  --color-primary: #5b4bd6;
}
```

The platform console does exactly this: it makes its **frame ink and its content
light**, inverts the two page surface roles (the page is a tinted canvas and the bands
on it are white), moves the accent from clinical blue to indigo, and holds the type
scale one notch below the workspace for an internal console.

The dark frame replaced an all-light version whose header was white on a near-white
canvas. That band had no edge, so the top of every screen read as flat however its
contents were sized or spaced - and a frame that is a different lightness from the
content it holds is the one version of it that cannot. It is also the strongest
reading of F1 P-03.4, "make it visibly internal". **One notch, not a shrunken copy.** An earlier version of that block took
every step down by about 20%, which put body text at 13px and the page title at 18px;
the console stopped reading as dense and started reading as small, because a hierarchy
needs distance between its steps and there was none left. Density belongs to the
spacing scale. The block lives in `_tokens.scss` rather than in the application, so that
`projects/platform/src/styles.scss` contains no palette at all and no application
stylesheet ever needs a raw colour value.

**Only roles are reassigned - never new names.** A `--platform-…` token would be a
name only one application understands, and the first step towards a `ui` component
branching on which console it is rendering in. The contrast test asserts this too.

## Spacing

One scale, six steps, used for every margin, padding and gap in the product.

| Token       | Value     |
| ----------- | --------- |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem`  |
| `--space-3` | `1rem`    |
| `--space-4` | `1.5rem`  |
| `--space-5` | `2rem`    |
| `--space-6` | `3rem`    |

**The intent is that picking a value is not a decision.** Six steps is the whole
point, not a starting position to be grown later. A scale with twelve steps turns
every gap into a judgement call and every review into an argument about whether 18px
or 20px was right; with six, adjacent steps are far enough apart that the right one is
obvious at a glance, and "it sits between two steps" is answered by taking the smaller
one. The cost is that some spacing ends up a couple of pixels off what a pixel-perfect
mockup asked for, which is the cheaper of the two mistakes.

The steps are roughly 1.5x apart and expressed in `rem` so they scale with the user's
browser font size. A clinical console gets used by people who have turned their
default text size up, and a `px` scale silently ignores them - which is also why
Stylelint rejects a `px` length in a spacing property outside this file.

## Typography (Latin)

Six size steps, three weights, three line heights - the same "few enough that
choosing is not a decision" argument as the spacing scale.

| Token             | Value      | Intended use                                   |
| ----------------- | ---------- | ---------------------------------------------- |
| `--font-size-xs`  | `0.75rem`  | Fine print, table footnotes.                   |
| `--font-size-sm`  | `0.875rem` | Secondary text, dense table cells.             |
| `--font-size-md`  | `1rem`     | Body text - the default.                       |
| `--font-size-lg`  | `1.25rem`  | Section heading.                               |
| `--font-size-xl`  | `1.5rem`   | Page heading.                                  |
| `--font-size-2xl` | `2rem`     | The one heading on a page that needs to shout. |

| Token                   | Value | Intended use                              |
| ----------------------- | ----- | ----------------------------------------- |
| `--font-weight-regular` | `400` | Body text.                                |
| `--font-weight-medium`  | `500` | Labels, active navigation, table headers. |
| `--font-weight-bold`    | `700` | Emphasis.                                 |

| Token                  | Value | Intended use                                      |
| ---------------------- | ----- | ------------------------------------------------- |
| `--line-height-tight`  | `1.2` | Headings, where loose leading looks disconnected. |
| `--line-height-normal` | `1.5` | Body text.                                        |
| `--line-height-loose`  | `1.7` | Long-form paragraphs.                             |

Line heights are unitless so they multiply whatever font size they land on, rather
than being frozen at the size they were written against. That property is what makes
the per-language override in the next section possible at all.

The Latin family is a **system font stack**, not a webfont:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

A webfont is a render-blocking network dependency and a flash of unstyled text, bought
in exchange for something no user of a clinical console would notice.

Nothing references `--font-family-latin` directly. Components reference
`--font-family-base`, which points at the Latin stack by default and is repointed for
Arabic by the `lang` selector below, so no component ever names a language.

`projects/ui/styles/_base.scss` is the only stylesheet that applies the scale to the
document (box sizing, and the body's family/size/weight/line-height/colour). It is
kept separate from the token file because they are different kinds of thing - one
declares values and styles nothing, the other styles elements and declares no values -
and that split is what lets Stylelint exempt exactly one file from the hardcoded-value
rules.

## Typography (Arabic)

### The font stack

```
'SF Arabic', 'Geeza Pro', 'Dubai', 'Segoe UI', 'Tahoma',
'Noto Naskh Arabic', 'Noto Sans Arabic', sans-serif
```

This is **not the Latin stack with a family swapped in**. The Latin stack is a chain of
Latin UI faces; asking it for Arabic gets whatever the platform happens to substitute,
which is a different decision on every machine and frequently a badly hinted fallback.
Each entry below is a real Arabic face, and the order is "best available on this
platform, then the next platform down".

| Family              | Where it comes from, and why it is in the list                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SF Arabic`         | macOS 12+ and iOS 16+ system Arabic face. Apple's own Arabic companion to the system UI font, so Arabic text matches the rest of the operating system.         |
| `Geeza Pro`         | The Arabic system face on earlier macOS/iOS, still installed. Covers Macs and iPads that predate SF Arabic.                                                    |
| `Dubai`             | Ships with Windows 10/11 and Office. An Arabic-**first** Naskh design, so it is preferred _over_ Segoe UI where it exists rather than being a fallback for it. |
| `Segoe UI`          | The Windows UI font, on every Windows install, with Arabic coverage. The guaranteed Windows step for machines without Office.                                  |
| `Tahoma`            | Older Windows. For years the readable default for Arabic UI text on Windows; kept as the last Windows step.                                                    |
| `Noto Naskh Arabic` | The Android system Arabic face, and the usual Linux one. Naskh is the expected style for running body text, which is most of what this product renders.        |
| `Noto Sans Arabic`  | Newer Android and Linux, and the face present in most CI container images.                                                                                     |
| `sans-serif`        | The platform's own default, so the last resort is still a face the platform chose for the script - rather than a Latin family with no Arabic coverage at all.  |

Every one of these is a **system font**. Nothing is downloaded, and no network request
is added. An Arabic webfont is a large file - Arabic needs up to four contextual forms
per letter plus ligatures - and making Arabic the language that waits on a download
would make the Arabic build the slower one.

### Arabic needs more line height than Latin at the same size

Arabic letterforms hang below the baseline and reach well above the x-height, words
connect into long unbroken strokes, and vowel marks sit above and below the letters. At
the Latin `1.5`, descenders of one line touch the ascenders of the next and a paragraph
becomes a wall. Each Arabic line height is about a quarter more than the Latin value it
replaces:

| Token                  | Latin | Arabic |
| ---------------------- | ----- | ------ |
| `--line-height-tight`  | `1.2` | `1.5`  |
| `--line-height-normal` | `1.5` | `1.85` |
| `--line-height-loose`  | `1.7` | `2.05` |

The override is four declarations at the bottom of `_tokens.scss`:

```scss
:root[lang='ar'] {
  --font-family-base: var(--font-family-arabic);
  --line-height-tight: 1.5;
  --line-height-normal: 1.85;
  --line-height-loose: 2.05;
}
```

Three things about that block are deliberate:

- **It is keyed off `lang`, not `dir`.** The reason Arabic needs more leading is the
  script, not the direction it runs in. `lang` is written by `LanguageService` in
  `core`, which is the only thing in the workspace that writes `lang`/`dir`.
- **It is not a second stylesheet.** It sits in the same file as the values it
  overrides, so there is no mirrored Arabic stylesheet to drift out of sync with the
  Latin one - the same argument that makes logical properties mandatory here.
- **It works because the line heights are unitless.** A unitless multiplier
  re-multiplies every size on the scale; a `px` line height would have been correct at
  exactly one font size.

## Enforcement

A token scale is only a single source of truth if nothing is allowed to bypass it. A
hardcoded colour or a hardcoded pixel gap is not a style mistake; it is a value that now
lives in two places, and the component is the copy nobody looks at when the palette or
the density changes. So it is enforced rather than reviewed for, in the one workspace
`stylelint.config.mjs`:

| Rule                                        | What it rejects                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `color-no-hex`                              | `#b3261e`                                                                             |
| `color-named`                               | `red`, `white`, …                                                                     |
| `function-disallowed-list`                  | `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()` |
| `declaration-property-unit-disallowed-list` | a `px` length in `margin*`, `padding*`, `inset*`, `gap`, `row-gap`, `column-gap`      |

Three rules for colour rather than one, because a colour literal has three spellings and
all three have to be closed: `#b3261e`, `rgb(179 38 30)` and `red` are the same mistake,
and a rule that catches only the first teaches people to write the second.

Every message names the tokens to use instead and points at this document, so the error
tells you what to do rather than only what not to.

What stays legal, reading the rule as "no hardcoded colour or pixel **spacing** value":

- `border: 1px solid var(--color-border)` - a border is not spacing, and a border
  measured in scale steps would be absurd.
- `outline-offset: 2px`, `border-radius: 0.25rem`, `grid-template-columns: 16rem 1fr` -
  sizes, not spacing.
- `margin: 0`, `gap: 0` - no unit, nothing to object to.
- `@media (width <= 60rem)` - the rule inspects declarations, and a breakpoint lives in a
  media query's parameters.
- `color-mix(in srgb, var(--color-primary) 10%, transparent)` - deliberately absent from
  the function list, because it composes tokens rather than spelling a colour out.

**One file is exempt**: `projects/ui/styles/_tokens.scss`, where the raw values are the
definitions rather than copies of them. The exemption is written as a path to that single
file rather than a folder glob, so a second stylesheet cannot acquire it by being dropped
next to it - `projects/ui/styles/_base.scss`, in the same folder, is fully linted.

## Numerals: decided, and closed

**Western numerals (1, 2, 3) everywhere, in both languages.** This is a settled product
decision, not a default that nobody got round to changing. It is written down here so
that it does not get reopened every time someone new sees Arabic text with Western
digits and assumes it is a bug.

The reasons, in the order they mattered:

- **One rendering path.** Every number - a dose, a date, an invoice total, a patient
  identifier - is drawn the same way in every language. There is no second numeral
  system to test, to line up in a table, or to get wrong in a printed document.
- **No per-market branch.** Numeral preference varies across the Arabic-speaking world,
  so "the Arabic numerals" is not one answer: choosing per-language would immediately
  become choosing per-country, and then per-tenant.
- **It matches the interfaces these users already read.** Most Gulf digital and medical
  interfaces - banking apps, government portals, lab reports, medication packaging -
  already present Western numerals.
- **It removes a clinical misreading risk.** A user who reads Egyptian conventions and
  a user who reads Gulf conventions must not be able to interpret the same rendered
  figure differently. With one numeral system, a dose or a measurement reads the same
  to both.

**There is no numeral-conversion layer in this codebase, and none should be added.** No
digit-mapping table, no locale-aware number formatter switched by language, no
`Intl.NumberFormat` with an `-u-nu-arab` extension. The implementation of this decision
is the deliberate absence of code, which is why it needs to be documented: absent code
leaves no trace for the next person to find.

The same decision is recorded in the workspace `README.md` and in
`projects/ui/src/lib/i18n/translations/README.md`, since those are the other two places
somebody would look before reaching for a conversion function.

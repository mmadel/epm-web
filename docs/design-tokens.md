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

`--color-muted-surface` and `--color-muted-text` are a pair: the muted text colour is
legible both on the page and on the muted fill, so a disabled control can be built
from the two without checking anything.

There are no warning or success tokens. They get added by the first ticket that
actually renders a warning or a success, rather than being guessed at now.

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

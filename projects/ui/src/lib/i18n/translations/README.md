# Translations

Arabic and English are both first-class in this product, and the language is switched
at runtime in a single build. Angular's built-in `$localize` cannot express that - it
is compile-time and needs one build per locale - so these are plain data.

## Folder convention

One folder, two files per feature area:

```
translations/
  common.en.ts   common.ar.ts    # wording reused across features
  shell.en.ts    shell.ar.ts     # header, navigation, language switch
  index.ts                       # merges the areas into one set per language
```

Areas are feature areas, not screens: a string used by two screens belongs in the area
that owns the wording, and wording with no owner belongs in `common`. The split exists
so that a feature's strings are reviewed with the feature, rather than everyone editing
one enormous file and resolving conflicts in it.

**To add an area** (F-04 adds `errors` this way): create `<area>.en.ts` and
`<area>.ar.ts` by copying the shape of `shell.en.ts` / `shell.ar.ts`, then add the two
spreads to `index.ts`. There is no registration list, no asset glob, no build step.

## Key convention

Keys are `area.context.name`, lower case, hyphenated within a segment:

```
shell.header.title
shell.language.label
common.action.save
```

The first segment is always the area, and always matches the file name - so a key seen
in a review or a bug report says which file it lives in. `context` is the part of the
area the string appears in; `name` is what the string is, not what it says (rename the
copy without renaming the key).

Keys are the unit of missing-translation reporting: an unknown key renders as the key
itself, so `shell.header.title` appearing in the UI is both a visible bug and its own
error message.

## Why TypeScript modules and not JSON

These ship inside a library that ng-packagr builds; JSON assets in a packaged library
are awkward, and would have to be fetched at runtime. TypeScript also buys the thing
that matters most here: `<area>.ar.ts` is typed as `Record<keyof typeof <area>En, string>`,
so a key that exists in English and not in Arabic - or a key misspelt in one of the two -
is a compile error rather than a blank label found in production.

## Numerals

Western numerals (1, 2, 3) in both languages. That is a product decision; there is no
numeral conversion anywhere in this codebase, and none should be added here.

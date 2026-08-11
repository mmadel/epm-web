// Single, workspace-wide Stylelint config covering every project's SCSS.
//
// The point of this file is the direction-agnostic layout rules below. Arabic
// and English are both first-class in this product, so direction is a property
// of the whole product rather than of a locale-specific stylesheet. A mirrored
// RTL stylesheet is a second place every layout rule lives - the two drift, and
// the Arabic version quietly becomes the worse one. Logical properties keep
// there being exactly one place.

const RTL_REASON =
  'Arabic and English are both first-class here, so direction is a property of the whole ' +
  'product. A mirrored RTL stylesheet would be a second place every layout rule lives; the two ' +
  'drift and the Arabic version quietly becomes the worse one. Use logical properties instead.';

// The other half of this file is the design token rules. A hardcoded colour or a
// hardcoded pixel gap is not a style mistake, it is a value that now lives in two
// places: the token file says one thing and the component says another, and the
// component is the one nobody looks at when the palette or the density changes.
// The tokens are only a single source of truth if nothing is allowed to bypass
// them, so this is enforced rather than reviewed for.
//
// Exactly one file is exempt - the file that defines the tokens. Its raw values
// are the definitions, not duplicates of them.
const TOKEN_DEFINITION_FILE = 'projects/ui/styles/_tokens.scss';

/** The colour roles, in the order docs/design-tokens.md lists them. */
const COLOUR_TOKENS = [
  '--color-surface',
  '--color-surface-raised',
  '--color-text',
  '--color-text-inverse',
  '--color-border',
  '--color-border-soft',
  '--color-border-strong',
  '--color-chrome-surface',
  '--color-chrome-text',
  '--color-chrome-muted-text',
  '--color-chrome-border',
  '--color-chrome-hover-surface',
  '--color-chrome-accent',
  '--color-chrome-focus',
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-soft',
  '--color-primary-deep',
  '--color-danger',
  '--color-danger-hover',
  '--color-muted-surface',
  '--color-muted-text',
  '--color-subtle-text',
  '--color-info-surface',
  '--color-info-text',
  '--color-info-mark',
  '--color-warning-surface',
  '--color-warning-text',
  '--color-warning-mark',
  '--color-danger-surface',
  '--color-danger-text',
  '--color-danger-mark',
];

/** The spacing scale, with the value of each step so the message is actionable. */
const SPACING_TOKENS = [
  '--space-1 (0.25rem)',
  '--space-2 (0.5rem)',
  '--space-3 (1rem)',
  '--space-4 (1.5rem)',
  '--space-5 (2rem)',
  '--space-6 (3rem)',
];

/**
 * Properties whose lengths are spacing, so a `px` value in one bypasses the scale.
 *
 * Read from the ticket literally - "no hardcoded colour or pixel SPACING value" -
 * so a `1px` border, a `2px` outline offset and a `16rem` column stay legal: they
 * are not spacing, and a border measured in scale steps would be absurd. `0` stays
 * legal everywhere because it has no unit for this rule to object to. Breakpoints
 * are untouched too: this rule only inspects declarations, and a breakpoint lives
 * in a media query's parameters.
 */
const SPACING_PROPERTIES = ['/^margin/', '/^padding/', '/^inset/', 'gap', 'row-gap', 'column-gap'];

const COLOUR_MESSAGE =
  `Use a colour token instead: ${COLOUR_TOKENS.map((token) => `var(${token})`).join(', ')}. ` +
  `They are defined in ${TOKEN_DEFINITION_FILE}, which is the only file allowed to hold a raw ` +
  'colour value; see docs/design-tokens.md for what each role means. If no role fits, add one ' +
  'there - named for its role and never for its hue.';

/** Physical property -> the logical property that replaces it. */
const LOGICAL_EQUIVALENT = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  left: 'inset-inline-start',
  right: 'inset-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
};

export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**'],
  rules: {
    'property-disallowed-list': [
      Object.keys(LOGICAL_EQUIVALENT),
      {
        message: (property) => {
          const logical =
            LOGICAL_EQUIVALENT[String(property).toLowerCase()] ?? 'a logical property';
          return `Direction-specific property "${property}" is not allowed - use "${logical}". ${RTL_REASON}`;
        },
      },
    ],

    'declaration-property-value-disallowed-list': [
      { 'text-align': ['left', 'right'] },
      {
        message: (property, value) => {
          const logical = String(value).toLowerCase() === 'left' ? 'start' : 'end';
          return (
            `Direction-specific value "${property}: ${value}" is not allowed - use ` +
            `"text-align: ${logical}". ${RTL_REASON}`
          );
        },
      },
    ],

    // -------------------------------------------------------------------------
    // Design tokens: no hardcoded colour, no hardcoded pixel spacing.
    // -------------------------------------------------------------------------

    // Three rules rather than one, because a colour literal has three spellings
    // and all three have to be closed - `#b3261e`, `rgb(179 38 30)` and `red` are
    // the same mistake, and a rule that catches only the first teaches people to
    // write the second.
    'color-no-hex': [true, { message: `Hardcoded hex colour. ${COLOUR_MESSAGE}` }],
    'color-named': ['never', { message: `Hardcoded named colour. ${COLOUR_MESSAGE}` }],

    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
      {
        message: (name) => `Hardcoded colour from "${name}()". ${COLOUR_MESSAGE}`,
      },
    ],
    // `color-mix()` is deliberately absent from that list: it composes tokens
    // (`color-mix(in srgb, var(--color-primary) 10%, transparent)`) rather than
    // spelling a colour out, so it is a use of the palette, not a bypass of it.

    'declaration-property-unit-disallowed-list': [
      Object.fromEntries(SPACING_PROPERTIES.map((property) => [property, ['px']])),
      {
        message: (property, unit) =>
          `"${property}" must not be measured in "${unit}". Use a spacing token: ` +
          `${SPACING_TOKENS.join(', ')}. One scale means a change of density is one edit; a ` +
          'stray pixel value is a place the product quietly stops agreeing with itself. `0` ' +
          'needs no token, and this does not apply to borders, outlines or breakpoints.',
      },
    ],

    // The scaffold uses plain kebab-case class names; the preset's stricter
    // pattern rules are not what this ticket is about.
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
    'no-descending-specificity': null,
    // The generated component stylesheets start out empty and that is fine.
    'no-empty-source': null,
  },

  overrides: [
    {
      // ---------------------------------------------------------------------
      // The platform console (F1 P-00.4)
      // ---------------------------------------------------------------------
      //
      // It is English-only and LTR-only, permanently, and it is excluded from
      // the direction rules above rather than made to work around them. If this
      // console ever needs Arabic, that is a decision, and THIS BLOCK IS WHERE
      // IT GETS MADE - deleting these four lines is what turns the rules back
      // on, which is a smaller and more visible change than unpicking a
      // stylesheet full of workarounds.
      //
      // The direction rules are switched off by REPLACING the disallowed list
      // rather than nulling it, because the same rule carries the other thing
      // this console must not do: F1 §1 settles that depth here comes from the
      // tonal step between the white bands and the canvas, and from nothing
      // else. A shadow added to one component later would match nothing in the
      // console around it, so it fails the build instead of reaching review.
      files: ['projects/platform/**/*.scss'],
      rules: {
        'property-disallowed-list': [
          ['box-shadow', 'text-shadow'],
          {
            message: (property) =>
              `"${property}" is not allowed in the platform console. Depth here is the tonal ` +
              'step between a white band (--color-surface-raised) and the canvas ' +
              '(--color-surface); there is no shadow anywhere in this application, and one ' +
              'added now would match nothing around it. See the F1 design handoff, §1.',
          },
        ],
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      // The one exemption, and it is the file the rules exist to protect: raw
      // values here are the definitions the rest of the workspace points at, not
      // copies of them. Kept as a path to a single file rather than a folder
      // glob, so a second stylesheet cannot quietly acquire the exemption by
      // being dropped next to this one.
      files: [TOKEN_DEFINITION_FILE],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'declaration-property-unit-disallowed-list': null,
      },
    },
  ],
};

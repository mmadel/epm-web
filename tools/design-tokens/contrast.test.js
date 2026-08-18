// Every colour pair the product actually puts on top of another one, checked
// against the WCAG contrast floor.
//
// This is a test rather than a review note because contrast is the one design
// property that is objectively decidable and completely invisible in a diff. A
// reviewer looking at `--color-warning-text: #a2711a` cannot tell that it fails
// on its own tint by half a point; this can, and it names the pair when it does.
//
// It reads the token file rather than a copy of the values, so a token edited
// without checking is what makes it fail. Adding a pair below is what makes a
// new treatment covered - the list is the specification of what gets checked,
// and it is deliberately explicit: deriving the pairs automatically would mean
// guessing which token is ever drawn on which, and guessing wrong quietly.

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const TOKENS = join(__dirname, '..', '..', 'projects', 'ui', 'styles', '_tokens.scss');

/** WCAG 2.2: 4.5:1 for body text, 3:1 for a non-text carrier such as a dot or an edge. */
const TEXT = 4.5;
const MARK = 3;

/**
 * The token values, per theme block.
 *
 * `:root` is the workspace default that the staff console wears;
 * `:root[data-app='platform']` reassigns some of the same roles for the platform
 * console, so a pair has to be checked against whichever theme it renders in.
 */
function readThemes() {
  const source = readFileSync(TOKENS, 'utf8');
  const themes = {};

  for (const [, selector, body] of source.matchAll(/^(:root[^{]*)\{([\s\S]*?)^\}/gm)) {
    const declarations = {};

    for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      declarations[name] = value.trim();
    }

    themes[selector.trim()] = declarations;
  }

  return themes;
}

/** Resolves a token in a theme, falling back to the workspace default. */
function value(themes, theme, token) {
  const resolved = themes[theme]?.[token] ?? themes[':root'][token];

  assert.ok(resolved, `No value for ${token} in ${theme} or :root`);
  assert.match(resolved, /^#[0-9a-f]{3,6}$/i, `${token} in ${theme} is not a plain hex colour`);

  return resolved;
}

function channels(hex) {
  const digits = hex.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;

  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
}

function relativeLuminance(hex) {
  const [r, g, b] = channels(hex).map((channel) => {
    const unit = channel / 255;

    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const PLATFORM = ":root[data-app='platform']";
const STAFF = ":root[data-app='staff']";
const DEFAULT = ':root';

/** [theme, description, foreground token, background token, floor] */
const PAIRS = [
  // ---------------------------------------------------------------------------
  // The platform console (F1 P-03)
  // ---------------------------------------------------------------------------
  [PLATFORM, 'body text on the canvas', '--color-text', '--color-surface', TEXT],
  [PLATFORM, 'body text on a white band', '--color-text', '--color-surface-raised', TEXT],
  [PLATFORM, 'supporting text on a band', '--color-muted-text', '--color-surface-raised', TEXT],
  [PLATFORM, 'supporting text on the canvas', '--color-muted-text', '--color-surface', TEXT],
  [PLATFORM, 'the blocked note on the canvas', '--color-subtle-text', '--color-surface', TEXT],
  [PLATFORM, 'a link on a band', '--color-primary', '--color-surface-raised', TEXT],
  [PLATFORM, 'a link on the canvas', '--color-primary', '--color-surface', TEXT],
  [PLATFORM, 'the add button label', '--color-text-inverse', '--color-primary', TEXT],
  [
    PLATFORM,
    'the add button label, hovered',
    '--color-text-inverse',
    '--color-primary-hover',
    TEXT,
  ],

  // The ink frame. Everything in the header band is drawn on it, and none of it
  // can be checked against the page surfaces - which is the whole reason the
  // chrome roles exist.
  [PLATFORM, 'the wordmark on the ink band', '--color-chrome-text', '--color-chrome-surface', TEXT],
  [
    PLATFORM,
    'the quiet step on the ink band - "Platform", the account initials',
    '--color-chrome-muted-text',
    '--color-chrome-surface',
    TEXT,
  ],
  [
    PLATFORM,
    'the wordmark tile on the ink band',
    '--color-chrome-accent',
    '--color-chrome-surface',
    MARK,
  ],
  [
    PLATFORM,
    'the wordmark glyph on its tile',
    '--color-text-inverse',
    '--color-chrome-accent',
    MARK,
  ],
  [
    PLATFORM,
    'the focus ring on the ink band',
    '--color-chrome-focus',
    '--color-chrome-surface',
    MARK,
  ],

  // The five environment chips. The design handoff calls these out as the risk
  // in this palette, and it was right about the amber one.
  // They are pale pills on the ink band, so each one is checked against its own
  // tint and not against the frame: a chip carries its tint, its word and its dot
  // with it, which is what lets it sit on a surface of any lightness.
  [PLATFORM, 'the local chip', '--color-muted-text', '--color-muted-surface', TEXT],
  [PLATFORM, 'the local chip dot', '--color-subtle-text', '--color-muted-surface', MARK],
  [PLATFORM, 'the development chip', '--color-info-text', '--color-info-surface', TEXT],
  [PLATFORM, 'the development chip dot', '--color-info-mark', '--color-info-surface', MARK],
  [PLATFORM, 'the staging chip', '--color-warning-text', '--color-warning-surface', TEXT],
  [PLATFORM, 'the staging chip dot', '--color-warning-mark', '--color-warning-surface', MARK],
  // Production's treatment is also what an unreadable environment wears.
  [PLATFORM, 'the production chip', '--color-danger-text', '--color-danger-surface', TEXT],
  [PLATFORM, 'the production chip dot', '--color-danger-mark', '--color-danger-surface', MARK],

  // The edge strip sits directly above the header, so it is read against the ink
  // band rather than against a page surface.
  [PLATFORM, 'the staging edge', '--color-warning-mark', '--color-chrome-surface', MARK],
  [PLATFORM, 'the production edge', '--color-danger-mark', '--color-chrome-surface', MARK],

  // The practice list's status pills (F1 P-04). Suspended and closed reuse the
  // staging and local chip treatments above, which are already checked; active is
  // the accent pair, and it is only checked here because this is the first screen
  // that sets text on `--color-primary-soft` rather than a glyph. The dot is
  // `currentcolor`, so the text pair covers it at the stricter floor.
  //
  // The same pair marks the run of a practice's name that the search matched, which
  // is body-sized text inside a name and so is held to the text floor either way.
  [
    PLATFORM,
    'an active practice pill, and a searched-for run of a name',
    '--color-primary-deep',
    '--color-primary-soft',
    TEXT,
  ],

  // The practice screen's seat and branch meters (F1 P-04). A bar on a track is a
  // non-text mark carrying a figure that is also written above it in words, so the
  // 3:1 floor is the right one - but a fill that does not separate from its own
  // track is a meter with no reading at all.
  [PLATFORM, 'a meter fill on its track', '--color-primary', '--color-muted-surface', MARK],
  [PLATFORM, 'a meter over its limit', '--color-danger-mark', '--color-muted-surface', MARK],

  // Non-text marks.
  [PLATFORM, 'the focus ring on a band', '--color-primary', '--color-surface-raised', MARK],
  [PLATFORM, 'the focus ring on the canvas', '--color-primary', '--color-surface', MARK],
  [PLATFORM, 'the empty-state icon on its tile', '--color-primary', '--color-primary-soft', MARK],

  // ---------------------------------------------------------------------------
  // The workspace default, which the staff console wears
  // ---------------------------------------------------------------------------
  [DEFAULT, 'body text on the page', '--color-text', '--color-surface', TEXT],
  [DEFAULT, 'body text on a raised surface', '--color-text', '--color-surface-raised', TEXT],
  [DEFAULT, 'supporting text on the page', '--color-muted-text', '--color-surface', TEXT],
  [
    DEFAULT,
    'supporting text on a muted surface',
    '--color-muted-text',
    '--color-muted-surface',
    TEXT,
  ],
  [DEFAULT, 'the third step of text on the page', '--color-subtle-text', '--color-surface', TEXT],
  [
    DEFAULT,
    'the third step of text on a raised surface',
    '--color-subtle-text',
    '--color-surface-raised',
    TEXT,
  ],
  // The chrome, which for the staff console is the same lightness as a card - the
  // defaults reproduce what these call sites hardcoded before the roles existed.
  // They are checked anyway: the point of a role is that it can be reassigned, and
  // an unchecked default is what makes the first reassignment somebody's surprise.
  [DEFAULT, 'navigation text on the chrome', '--color-chrome-text', '--color-chrome-surface', TEXT],
  [
    DEFAULT,
    'navigation text on a hovered entry',
    '--color-chrome-text',
    '--color-chrome-hover-surface',
    TEXT,
  ],
  [
    DEFAULT,
    'supporting text on the chrome',
    '--color-chrome-muted-text',
    '--color-chrome-surface',
    TEXT,
  ],
  [DEFAULT, 'the focus ring on the chrome', '--color-chrome-focus', '--color-chrome-surface', MARK],

  [DEFAULT, 'an active navigation entry', '--color-text-inverse', '--color-primary', TEXT],
  [
    DEFAULT,
    'a hovered active navigation entry',
    '--color-text-inverse',
    '--color-primary-hover',
    TEXT,
  ],
  [DEFAULT, 'text on the soft accent', '--color-primary-deep', '--color-primary-soft', TEXT],
  [DEFAULT, 'text on a filled danger area', '--color-text-inverse', '--color-danger', TEXT],
  [DEFAULT, 'an info tint', '--color-info-text', '--color-info-surface', TEXT],
  [DEFAULT, 'an info mark', '--color-info-mark', '--color-info-surface', MARK],
  [DEFAULT, 'a warning tint', '--color-warning-text', '--color-warning-surface', TEXT],
  [DEFAULT, 'a warning mark', '--color-warning-mark', '--color-warning-surface', MARK],
  [DEFAULT, 'a danger tint', '--color-danger-text', '--color-danger-surface', TEXT],
  [DEFAULT, 'a danger mark', '--color-danger-mark', '--color-danger-surface', MARK],
  [DEFAULT, 'the focus ring on the page', '--color-primary', '--color-surface', MARK],

  // ---------------------------------------------------------------------------
  // The staff console (T-97)
  // ---------------------------------------------------------------------------

  // A clinical palette: white content, a cool blue-grey frame, deep teal accent. It
  // reassigns most of the roles, so the DEFAULT pairs above no longer describe what
  // it renders - they now cover the patient application, which has claimed no
  // identity of its own yet.
  [STAFF, 'body text on the page', '--color-text', '--color-surface', TEXT],
  [STAFF, 'body text on a tinted block', '--color-text', '--color-surface-raised', TEXT],
  [STAFF, 'supporting text on the page', '--color-muted-text', '--color-surface', TEXT],
  [
    STAFF,
    'supporting text on a tinted block',
    '--color-muted-text',
    '--color-surface-raised',
    TEXT,
  ],
  [STAFF, 'the third step of text on the page', '--color-subtle-text', '--color-surface', TEXT],
  [
    STAFF,
    'the third step of text on a tinted block',
    '--color-subtle-text',
    '--color-surface-raised',
    TEXT,
  ],
  [STAFF, 'a link on the page', '--color-primary', '--color-surface', TEXT],
  [STAFF, 'a hovered link on the page', '--color-primary-hover', '--color-surface', TEXT],
  [STAFF, 'a label on a filled accent area', '--color-text-inverse', '--color-primary', TEXT],
  [STAFF, 'text on the soft accent', '--color-primary-deep', '--color-primary-soft', TEXT],

  // The header band and the record's tab band. Both are the chrome surface, and
  // everything drawn on either is read against it.
  [STAFF, 'the product name in the header', '--color-chrome-text', '--color-chrome-surface', TEXT],
  [
    STAFF,
    "the console's name beside it, in the quiet step",
    '--color-chrome-muted-text',
    '--color-chrome-surface',
    TEXT,
  ],

  // The wordmark's tile, and the glyph inside it. The tile is a filled shape on the
  // band and the glyph is a non-text mark on the tile, so both take the 3:1 floor -
  // the words beside them are what carry the name.
  [STAFF, 'the wordmark tile on the header band', '--epm-accent', '--color-chrome-surface', MARK],
  [STAFF, 'the wordmark glyph on its tile', '--color-text-inverse', '--epm-accent', MARK],

  // The tabs. A resting tab is a label on the band; the active one is a label on the
  // page's own surface, because the tab is painted in it and joined to it.
  [
    STAFF,
    'a resting tab label on the band',
    '--color-chrome-muted-text',
    '--color-chrome-surface',
    TEXT,
  ],
  [
    STAFF,
    'a hovered tab label on its hover surface',
    '--color-chrome-text',
    '--color-chrome-hover-surface',
    TEXT,
  ],
  [STAFF, 'the active tab label on the sheet', '--color-text', '--color-surface', TEXT],
  [
    STAFF,
    "the accent edge along the active tab's top",
    '--color-chrome-accent',
    '--color-chrome-surface',
    MARK,
  ],

  [STAFF, 'the focus ring on the frame', '--color-chrome-focus', '--color-chrome-surface', MARK],
  [STAFF, 'the focus ring on the page', '--color-primary', '--color-surface', MARK],
];

test('every colour the product stacks on another clears its contrast floor', () => {
  const themes = readThemes();
  const failures = [];

  for (const [theme, description, foreground, background, floor] of PAIRS) {
    const ratio = contrast(value(themes, theme, foreground), value(themes, theme, background));

    if (ratio < floor) {
      failures.push(
        `${description} (${theme}): ${foreground} on ${background} is ` +
          `${ratio.toFixed(2)}:1, needs ${floor}:1`,
      );
    }
  }

  // Every failure at once. Fixing a palette one reported pair per run is how a
  // contrast pass turns into six pull requests.
  assert.deepEqual(failures, []);
});

test('the platform theme reassigns roles rather than inventing names', () => {
  const themes = readThemes();
  const invented = Object.keys(themes[PLATFORM]).filter((token) => !(token in themes[DEFAULT]));

  // A `--platform-…` token would be a name only one application understands, and
  // the first step towards a `ui` component that has to branch on which console
  // it is rendering in.
  assert.deepEqual(invented, []);
});

test('the staff theme reassigns roles rather than inventing names', () => {
  const themes = readThemes();
  const invented = Object.keys(themes[STAFF]).filter((token) => !(token in themes[DEFAULT]));

  // Same rule the platform console is held to, and for the same reason: a name
  // only one application understands is the first step towards a `ui` component
  // that branches on which console it is rendering in.
  assert.deepEqual(invented, []);
});

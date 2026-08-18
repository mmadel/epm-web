// The one token that says WHICH CONSOLE IS OPEN.
//
// A person can hold an account in the staff console and in the platform console.
// The two are separate applications against separate Keycloak realms and they run
// under opposite tenancy rules - one of them with the tenant filter off - so a
// screenshot of one being mistakable for the other quietly undoes the reason they
// were split. The wordmark and this colour are what separate them.
//
// It is checked here rather than in a component spec because the value is not in
// any component: `ui` REFERENCES `--epm-accent` and each application SETS it, so
// the only place the two halves meet is the token file and the `data-app`
// attribute that selects a block in it. A rendered DOM in jsdom has neither.
//
// See T-97 §4 and §7 criterion 11.

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = join(__dirname, '..', '..');
const TOKENS = join(root, 'projects', 'ui', 'styles', '_tokens.scss');
const STAFF_INDEX = join(root, 'projects', 'staff', 'src', 'index.html');
const WORDMARK = join(root, 'projects', 'ui', 'src', 'lib', 'shell', 'wordmark', 'wordmark.scss');

const ACCENT = '--epm-accent';

/** The platform console's, per T-97 §4. Whatever the staff console wears, not this. */
const PLATFORM_ACCENT = '#0e7c66';

/** The declarations in one `:root…` block of the token file. */
function block(selector) {
  const source = readFileSync(TOKENS, 'utf8');
  const declarations = {};

  for (const [, found, body] of source.matchAll(/^(:root[^{]*)\{([\s\S]*?)^\}/gm)) {
    if (found.trim() !== selector) {
      continue;
    }

    for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      declarations[name] = value.trim();
    }
  }

  return declarations;
}

test('the workspace declares a console accent for an application to reassign', () => {
  // The default matters as much as the reassignment: a `ui` component references
  // the token unconditionally, and an application that has not claimed an identity
  // yet - the patient app - would otherwise render an uncoloured shape.
  assert.ok(block(':root')[ACCENT], `${ACCENT} is not declared in :root`);
});

test('the staff console sets its own console accent', () => {
  const value = block(":root[data-app='staff']")[ACCENT];

  assert.ok(value, `${ACCENT} is not set for the staff console`);
  // A plain hex rather than an alias. An alias is the right default; it is the
  // wrong value for a console that has claimed an identity, because it would
  // follow a later change to the action colour made for a contrast reason and
  // quietly restyle the wordmark with it.
  assert.match(value, /^#[0-9a-f]{3,6}$/i, `${ACCENT} for the staff console is not a plain hex`);
});

test('the staff console accent is not the platform console accent', () => {
  const value = block(":root[data-app='staff']")[ACCENT].toLowerCase();

  // The whole point of the token. A value the two consoles share is a value
  // neither of them can be identified by.
  assert.notEqual(value, PLATFORM_ACCENT);
});

test('the staff application opts into its own block', () => {
  // Without the attribute the block above is dead stylesheet, and the console
  // silently renders the default. That failure is invisible in every test that
  // does not compile CSS, which is all of them.
  const html = readFileSync(STAFF_INDEX, 'utf8');

  assert.match(html, /<html[^>]*\sdata-app="staff"/);
});

test('the shared wordmark is what consumes the console accent', () => {
  // `ui` references the token and the application sets it. A token nothing reads
  // is a token that is set correctly and shows nothing, which is the one failure
  // mode a value check cannot see.
  assert.match(readFileSync(WORDMARK, 'utf8'), /var\(--epm-accent\)/);
});

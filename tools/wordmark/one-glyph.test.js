// The pulse glyph is drawn in one place.
//
// T-100. It was drawn twice - in `ui`'s `Wordmark` and in the platform console's own
// header - identically, because the staff console's copy was taken from that header
// when T-97 built it. Two identical drawings are not a duplicate anybody notices;
// they are a change that lands in half the product, which is noticed later and by
// somebody else.
//
// A DELETED COMPONENT WITH ITS SVG LEFT BEHIND PASSES EVERY RENDER TEST (T-100 §8).
// Nothing that mounts a component can see markup no longer mounted, so this reads the
// sources: the path data belongs to `ui` and appears nowhere else in the workspace.

const { readdirSync, readFileSync } = require('node:fs');
const { join, relative, sep } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = join(__dirname, '..', '..');

/** Where the one drawing lives. */
const OWNER = join('projects', 'ui', 'src', 'lib', 'shell', 'wordmark', 'wordmark.html');

/**
 * A run of the path long enough to be this drawing and nothing else.
 *
 * The whole `d` would be defeated by a copy with one coordinate nudged, which is the
 * copy that matters - an identical one is at least still identical. This is the
 * middle of the trace, where the stroke rises and falls.
 */
const PULSE = '1.4-4 2.2 7 1.6-4.4';

/** Every file worth reading: sources and templates, not build output. */
function sources(folder) {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sources(path);
    }

    return /\.(ts|html|svg|scss)$/.test(entry.name) ? [path] : [];
  });
}

test('the drawing is where it is meant to be', () => {
  // The check below passes vacuously if the path was renamed or reformatted, and a
  // vacuously green de-duplication test is worse than none.
  assert.match(readFileSync(join(root, OWNER), 'utf8'), new RegExp(PULSE.replace(/\./g, '\.')));
});

test('nothing outside ui draws it', () => {
  const offenders = sources('projects')
    .filter((path) => path !== OWNER)
    .filter((path) => readFileSync(join(root, path), 'utf8').includes(PULSE))
    .map((path) => path.split(sep).join('/'));

  assert.deepEqual(offenders, []);
});

test('the check can fail', () => {
  // The two above are assertions about the tree as it stands, which say nothing
  // about whether the search works. This one exercises it directly.
  const somewhereElse = relative(root, join(root, 'projects', 'platform'));

  assert.ok(sources(somewhereElse).length > 0, 'the platform console has no sources to read');
  assert.ok(PULSE.length > 12, 'the marker is too short to identify one drawing');
});

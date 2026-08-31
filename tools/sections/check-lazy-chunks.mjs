// Every section of the staff console must arrive in its own chunk.
//
// THIS IS THE ONE CRITERION A GREEN TEST SUITE HIDES (T-97 §8). Four eager imports
// render every screen correctly, resolve every route, and pass every spec in the
// repository - and produce one bundle, so the console downloads four screens to show
// one. Nothing about that is visible from a rendered DOM, which is why this reads the
// build output instead.
//
// It runs as `postbuild`, so `npm run build` enforces it. It deliberately does not
// live in `tools/**/*.test.js`: those run without ever building, and a check that
// quietly passes because there is nothing to look at is worse than no check.
//
// Usage:  npm run build   (or: node tools/sections/check-lazy-chunks.mjs)

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

const BUILD = resolve(import.meta.dirname, '..', '..', 'dist', 'staff', 'browser');

/**
 * The selector of each section, and the ticket that fills it.
 *
 * A SELECTOR IS THE MARKER because it appears in exactly one place: the component's
 * own compiled output. A translation key would appear in the main bundle too - the
 * strings live in `ui` - and a class name can be minified away.
 */
const SECTIONS = [
  { selector: 'app-practice-section', ticket: 'T-65' },
  { selector: 'app-clinics-section', ticket: 'T-66' },
  { selector: 'app-staff-section', ticket: 'T-67' },
  { selector: 'app-subscription-section', ticket: 'T-69' },
];

/** The scripts index.html loads on first paint: the initial bundle. */
async function initialScripts() {
  const html = await readFile(join(BUILD, 'index.html'), 'utf8');

  return [...html.matchAll(/src="([^"]+\.js)"/g)].map(([, src]) => src.replace(/^\.?\//, ''));
}

async function check() {
  let entries;

  try {
    entries = await readdir(BUILD);
  } catch {
    throw new Error(
      `No build output at ${BUILD}. Run \`npm run build\` - this check reads what the ` +
        'build produced, so there is nothing for it to say until there is a build.',
    );
  }

  const initial = new Set(await initialScripts());
  const scripts = entries.filter((name) => name.endsWith('.js'));
  const sources = new Map(
    await Promise.all(
      scripts.map(async (name) => [name, await readFile(join(BUILD, name), 'utf8')]),
    ),
  );

  const failures = [];

  for (const { selector, ticket } of SECTIONS) {
    const carrying = scripts.filter((name) => sources.get(name).includes(selector));
    const eager = carrying.filter((name) => initial.has(name));

    if (eager.length > 0) {
      failures.push(
        `${selector} (${ticket}) is in the initial bundle (${eager.join(', ')}). ` +
          'Its route must use `loadComponent`, not `component` - see app.routes.ts.',
      );
      continue;
    }

    if (carrying.length === 0) {
      failures.push(
        `${selector} (${ticket}) is in no chunk at all. Either the section was renamed ` +
          'without renaming it here, or its route no longer reaches it.',
      );
    }
  }

  // Two sections sharing one chunk is still lazy, and still wrong: opening one
  // downloads the other, which is the cost this check exists to prevent.
  const shared = new Map();

  for (const { selector } of SECTIONS) {
    for (const name of scripts.filter((file) => sources.get(file).includes(selector))) {
      shared.set(name, [...(shared.get(name) ?? []), selector]);
    }
  }

  for (const [name, selectors] of shared) {
    if (selectors.length > 1) {
      failures.push(`${selectors.join(' and ')} share one chunk (${name}).`);
    }
  }

  if (failures.length > 0) {
    // Every failure at once. Fixing four routes one report per build is how a lazy
    // loading pass turns into four pull requests.
    throw new Error(`Sections are not separately loaded:\n  - ${failures.join('\n  - ')}`);
  }

  console.log(
    `Lazy sections check passed: ${SECTIONS.length} sections, each in its own chunk, ` +
      'none in the initial bundle.',
  );
}

check().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

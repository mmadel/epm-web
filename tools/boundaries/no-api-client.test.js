// The shell calls nothing, and `ui` never reaches for the generated client.
//
// T-97 §4: this ticket makes no HTTP request at all. A header showing the
// practice's name is the practice section's answer to a call it makes itself, not
// the frame's own fetch, and a shell that acquired one would be a request every
// screen in the console pays for on every load.
//
// The second half is the boundary the four section tickets inherit: a shared `ui`
// component that imports `api-client` is a call every application mounting it has
// to accept, and the fix is always to move the call up into a container in
// `staff`. A workspace-wide lint rule is the real answer and it is its own ticket
// (T-97 §9); until it exists this covers the two folders the shell lives in.
//
// IT IS A VALUE IMPORT THAT IS THE BOUNDARY, NOT A TYPE ONE. A service, a token or
// a constant from the generated client is code that ships and can make a request;
// `import type` is erased by the compiler and ships nothing. `ui` already aliases
// the generated `Problem` model under a local name (see `problem.ts`), and that is
// the opposite of the failure this guards against - it is what stops the library
// keeping its own copy of a server shape.
//
// IT READS THE SOURCES rather than the running application, because an unused
// import is invisible at runtime: it costs bundle size and it makes the boundary
// false, and neither shows up in a rendered DOM. The complement - that nothing
// actually issues a request on load - is `no-api-client.spec.ts` in the staff
// console, which mounts the shell against a mock backend and verifies that no
// request was opened.
//
// It lives here rather than beside that spec because reading the file system is
// what the application test environment cannot do: its specs are bundled for a
// browser, and `node:fs` does not survive that.

const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = join(__dirname, '..', '..');

const FOLDERS = [join('projects', 'ui', 'src'), join('projects', 'staff', 'src', 'app')];

/**
 * The composition root, and its spec: the two files allowed to name the generated
 * client as a value.
 *
 * `app.config.ts` provides `BASE_PATH` and provides nothing else - a token, not a
 * call. The generated `BaseService` falls back to `http://localhost` when that
 * token is absent, so the first screen in the console to make a request would not
 * fail, it would quietly talk to whatever is on port 80 of the machine the browser
 * is on. Wiring that up is the application's job; making a request is not the
 * shell's. The spec beside it asserts exactly that wiring, so it names the same
 * token.
 */
const COMPOSITION_ROOT = [
  join('projects', 'staff', 'src', 'app', 'app.config.ts'),
  join('projects', 'staff', 'src', 'app', 'app.config.spec.ts'),
];

/** `import … from 'api-client'`, but not `import type … from 'api-client'`. */
const VALUE_IMPORT = /^import\s+(?!type\s)[\s\S]*?from\s+['"]api-client['"]/m;

/** Every TypeScript source under a folder, relative to the workspace root. */
function sources(folder) {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) {
      return sources(path);
    }

    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

test('there are sources to check', () => {
  // The check below passes vacuously if the walk finds nothing - a renamed folder,
  // a moved project - and a vacuously green boundary test is worse than none.
  for (const folder of FOLDERS) {
    assert.ok(sources(folder).length > 0, `no sources found under ${folder}`);
  }
});

test('nothing but the composition root imports api-client as a value', () => {
  const offenders = FOLDERS.flatMap(sources)
    .filter((path) => !COMPOSITION_ROOT.includes(path))
    .filter((path) => VALUE_IMPORT.test(readFileSync(join(root, path), 'utf8')));

  assert.deepEqual(offenders, []);
});

test('the composition root is a real file, and really does import it', () => {
  // The exemption is only honest while the thing it exempts exists. A renamed
  // app.config.ts would leave a filter matching nothing, and the exemption would
  // sit here looking like it was still doing something.
  for (const path of COMPOSITION_ROOT) {
    assert.match(readFileSync(join(root, path), 'utf8'), VALUE_IMPORT, path);
  }
});

test('a type-only import is not what this forbids', () => {
  // The distinction is the whole rule, so it is exercised rather than described.
  assert.equal(VALUE_IMPORT.test("import type { Problem } from 'api-client';"), false);
  assert.equal(VALUE_IMPORT.test("import { BASE_PATH } from 'api-client';"), true);
  assert.equal(
    VALUE_IMPORT.test("import {\n  BASE_PATH,\n  Configuration,\n} from 'api-client';"),
    true,
  );
});

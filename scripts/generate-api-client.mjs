#!/usr/bin/env node
/**
 * Regenerates the typed API client into `projects/api-client/src/generated/`.
 *
 * The input is `node_modules/@mmadel/openapi-spec/openapi.json`: the
 * specification the backend generates from its own controllers (T-84) and
 * publishes as a versioned npm package (T-90). Nothing in this workspace may
 * hand-write a request or response type: the server's shapes have exactly one
 * definition, and it is the specification. A field the backend renames therefore
 * breaks `ng build` here, rather than reaching a user as an undefined at runtime.
 *
 * The package is PINNED EXACTLY in package.json, so this script produces the same
 * client today as it did last month, and an API change arrives the only way it
 * should: as a deliberate version bump, reviewed as a diff. Before T-91 the
 * specification was a file copied into this repository by hand, which had the
 * same shape as a pin and none of its guarantees - nothing recorded which version
 * of the backend the copy came from, or whether the copy was current.
 *
 * Reading it from node_modules is why `npm ci` here needs a registry token; see
 * .npmrc and scripts/check-packages-token.mjs.
 *
 * The output is COMMITTED. That is what lets a clean checkout build without Java
 * installed, and it is what CI's staleness check compares against - CI runs this
 * script and then `git diff --exit-code`, so a specification change that was not
 * regenerated fails the build and names the difference.
 *
 * Two details keep that check honest, and both are the reason this is a script
 * rather than a bare `openapi-generator-cli generate` in package.json:
 *
 *   1. The output directory is WIPED first. The generator writes files but never
 *      removes them, so an operation deleted from the specification would leave
 *      its service file behind for ever - present in the working tree, absent
 *      from a from-scratch generation, and invisible to `git diff` because
 *      nothing changed it. Wiping makes "what is committed" and "what this
 *      script produces" the same question.
 *   2. `.openapi-generator-ignore` is written before the generator runs. The
 *      typescript-angular generator also emits a README, a `git_push.sh` and a
 *      nested `.gitignore` - publishing scaffolding for a standalone client
 *      package, none of which applies to a library inside this workspace, and a
 *      nested `.gitignore` under `src/` actively misleads anyone who finds it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Both paths are also declared in openapitools.json, which is what the generator
// itself reads. They are repeated here only to check the input exists and to wipe
// the output; openapitools.json stays the single source of truth for the run.
const SPEC_PACKAGE = '@mmadel/openapi-spec';
const SPEC = join(workspaceRoot, 'node_modules', ...SPEC_PACKAGE.split('/'), 'openapi.json');
const OUTPUT = join(workspaceRoot, 'projects', 'api-client', 'src', 'generated');

// Files the generator emits for a client published as its own npm package.
const NOT_PART_OF_THE_LIBRARY = ['README.md', 'git_push.sh', '.gitignore'];

if (!existsSync(SPEC)) {
  fail(
    `The OpenAPI specification is missing: ${relative(workspaceRoot, SPEC)}`,
    [
      `It ships in ${SPEC_PACKAGE}, which is a devDependency of this workspace,`,
      'so the usual cause is that nothing has installed it yet:',
      '',
      '  npm ci',
      '',
      'If that failed with a 401 or a 404 from npm.pkg.github.com, the package is',
      'not missing - the token is. See scripts/check-packages-token.mjs.',
      '',
      'Do not hand-write the specification, and do not hand-write the types it',
      'would have produced: a specification written here would describe the API',
      'this workspace imagines rather than the one the backend serves. It is',
      "generated from the backend's controllers, and arrives here as a version.",
    ].join('\n  '),
  );
}

// Wipe, then re-create, so the generator writes into a directory that contains
// nothing but the ignore file below.
//
// The retries are for Windows, where a handle left open on a file that was just
// written - by the JVM this script spawned a moment ago, by an editor, or by a
// virus scanner reading it - makes the delete fail with EPERM. It succeeds on a
// second attempt; without the retries, running this script twice in quick
// succession fails on Windows and works on CI, which is the worst shape a
// failure can have.
rmSync(OUTPUT, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
mkdirSync(OUTPUT, { recursive: true });
writeFileSync(join(OUTPUT, '.openapi-generator-ignore'), ignoreFileContents(), 'utf8');

// The version is printed rather than merely used: it is the one fact that tells
// you which API this client is about to describe, and it is otherwise invisible
// in the output.
const specVersion = JSON.parse(
  readFileSync(
    join(workspaceRoot, 'node_modules', ...SPEC_PACKAGE.split('/'), 'package.json'),
    'utf8',
  ),
).version;

console.log(
  `[generate-api-client] ${SPEC_PACKAGE}@${specVersion} -> ${relative(workspaceRoot, OUTPUT)}`,
);

// No arguments: the generator name, the input and every additional property live
// in openapitools.json, alongside the pinned generator version. A flag passed
// here and not there would be a flag CI did not use.
const { status, error } = spawnSync('npx openapi-generator-cli generate', {
  cwd: workspaceRoot,
  stdio: 'inherit',
  // `npx` is a shell script on POSIX and a .cmd on Windows, so it is spawned
  // through a shell rather than executed directly.
  shell: true,
});

if (error || status !== 0) {
  fail(
    'openapi-generator-cli failed.',
    [
      'The generator runs on a JVM. If the failure above mentions `java`, install',
      'a JDK (17 or newer) and try again; CI installs one explicitly.',
      '',
      'If it compiled but the OUTPUT does not typecheck against this workspace’s',
      'Angular version, do not edit the generated files - the fix is the pinned',
      'generator version in openapitools.json, or its template. Report it.',
    ].join('\n  '),
  );
}

console.log('[generate-api-client] Done. Commit the result: it is checked by CI.');

function ignoreFileContents() {
  return [
    '# GENERATED FILE - DO NOT EDIT.',
    '# Written by scripts/generate-api-client.mjs before every generation.',
    '#',
    '# These are scaffolding for a client published as its own npm package. This',
    '# client is a library inside the epm-web workspace, so none of them applies.',
    '',
    ...NOT_PART_OF_THE_LIBRARY,
    '',
  ].join('\n');
}

function fail(problem, detail) {
  console.error('');
  console.error(`[generate-api-client] Stopped: ${problem}`);
  console.error('');
  console.error(`  ${detail}`);
  console.error('');
  process.exit(1);
}

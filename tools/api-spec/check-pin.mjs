#!/usr/bin/env node
/**
 * Two repository checks that a compiler cannot make, run as part of `npm run lint`.
 *
 * 1. `@mmadel/openapi-spec` is pinned to an EXACT version.
 *
 *    A range is the failure this ticket exists to prevent. `^0.1.0` means two
 *    developers install two specifications a fortnight apart, each generates a
 *    client from the one they happened to get, and the diff between them is
 *    attributed to whoever pushed second. Worse, nothing in the repository
 *    records which specification the committed client came from, so a staleness
 *    check - which regenerates and compares - starts failing for reasons
 *    unrelated to the commit that fails it.
 *
 *    Bumping by hand is the point. It is the moment somebody reads an API change.
 *
 * 2. No token literal is committed.
 *
 *    `.npmrc` must read the token from the environment. A GitHub token that
 *    reaches a commit is a token to rotate, and it stays readable in the history
 *    afterwards, so this is cheaper to prevent than to undo. The scan covers
 *    every tracked file, not just `.npmrc`: a token pasted into a README or a
 *    script while debugging an install is the likelier accident.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const SPEC_PACKAGE = '@mmadel/openapi-spec';

// npm's own vocabulary for "not one version": range operators, wildcards, the
// dist-tags, a URL or a git specifier, and the empty string. Anything that is
// not a bare `x.y.z` (optionally with a prerelease or build suffix) is rejected.
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// GitHub's token prefixes, which are stable and documented: ghp_ (classic
// personal access token), gho_ (OAuth), ghu_/ghs_ (app), ghr_ (refresh), and
// github_pat_ (fine-grained). Matching the prefix plus a run of token characters
// avoids flagging prose that merely says "ghp_" while explaining the format.
const TOKEN_LITERAL = /\b(?:gh[posur]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/;

/**
 * @param {string} version the value of the dependency in package.json
 * @returns {string | null} why it is not an exact pin, or null if it is one
 */
export function whyNotExact(version) {
  if (typeof version !== 'string' || version.trim() === '') {
    return 'it has no version at all';
  }
  if (EXACT_VERSION.test(version.trim())) {
    return null;
  }
  return `"${version}" is not one version`;
}

/**
 * @param {string} contents a file's text
 * @returns {boolean} whether it contains something shaped like a GitHub token
 */
export function containsTokenLiteral(contents) {
  return TOKEN_LITERAL.test(contents);
}

// Running this file directly is the check; importing it is the unit test.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const problems = [...checkThePin(), ...checkForCommittedTokens()];

  if (problems.length > 0) {
    console.error('');
    for (const problem of problems) {
      console.error(`API specification check failed: ${problem}`);
      console.error('');
    }
    process.exit(1);
  }

  console.log(`API specification check passed: ${SPEC_PACKAGE} is pinned, no token is committed.`);
}

function checkThePin() {
  const manifest = JSON.parse(readFileSync(join(workspaceRoot, 'package.json'), 'utf8'));
  const version = manifest.devDependencies?.[SPEC_PACKAGE] ?? manifest.dependencies?.[SPEC_PACKAGE];

  if (version === undefined) {
    return [
      `${SPEC_PACKAGE} is not a dependency of this workspace.\n` +
        '  It is where openapi.json comes from - see the "Bumping the API version" section of the README.',
    ];
  }

  const why = whyNotExact(version);
  return why === null
    ? []
    : [
        `${SPEC_PACKAGE} must be pinned to an exact version, and ${why}.\n` +
          '  Two developers on a range generate from two specifications and neither can tell.\n' +
          `  Fix it with:  npm i -E ${SPEC_PACKAGE}@<version>`,
      ];
}

function checkForCommittedTokens() {
  // Tracked files only. node_modules, dist/ and .angular/ are none of this
  // check's business, and a scan of the working tree would spend its time there.
  const { status, stdout } = spawnSync('git', ['ls-files', '-z'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (status !== 0) {
    return ['git ls-files failed, so the committed files could not be scanned for tokens.'];
  }

  const offenders = stdout
    .split('\0')
    .filter((path) => path !== '')
    .filter((path) => {
      let contents;
      try {
        contents = readFileSync(join(workspaceRoot, path), 'utf8');
      } catch {
        // Deleted-but-tracked, or not decodable as text. Neither hides a token
        // that git would show in a diff.
        return false;
      }
      return containsTokenLiteral(contents);
    });

  return offenders.length === 0
    ? []
    : [
        `a GitHub token appears to be committed, in:\n  - ${offenders.join('\n  - ')}\n` +
          '  Remove it and ROTATE IT - it is readable in the history whatever the next commit does.\n' +
          '  The token belongs in NODE_AUTH_TOKEN in the environment; .npmrc reads it from there.',
      ];
}

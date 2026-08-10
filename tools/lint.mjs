// Runs every linter and fails if any of them failed.
//
// A shell `&&` would short-circuit: one ESLint error and Stylelint never runs,
// so a contributor fixes one rule only to be told about the next on the following
// push - and a CI failure would only ever name half the rules that are broken.
// Both linters always run; the exit code is the aggregate.
import { spawnSync } from 'node:child_process';

const LINTERS = [
  ['ESLint', 'lint:es'],
  ['Stylelint', 'lint:styles'],
];

const failed = [];

for (const [name, script] of LINTERS) {
  console.log(`\n==> ${name}`);
  // Delegated to the individual npm scripts so each linter's command line is
  // defined in exactly one place. Passed as a single string because `npm` is a
  // shell script on POSIX and a .cmd on Windows.
  const { status } = spawnSync(`npm run --silent ${script}`, {
    stdio: 'inherit',
    shell: true,
  });
  if (status !== 0) {
    failed.push(name);
  }
}

if (failed.length > 0) {
  console.error(`\nLint failed: ${failed.join(', ')}.`);
  process.exit(1);
}

console.log('\nLint passed.');

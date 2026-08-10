#!/usr/bin/env node
/**
 * Generates the per-application environment file: the API base URL, and the name
 * of the environment the bundle is being built for.
 *
 * The API base URL is never same-origin and never relative: the staff console and
 * the patient app are deployed separately from the API (the patient app ships as a
 * Capacitor bundle served from `capacitor://`). It therefore has to be supplied at
 * build time, and a build with a missing or invalid value must fail before Angular
 * starts rather than produce a bundle that points nowhere.
 *
 * THE ENVIRONMENT NAME IS DELIBERATELY NOT VALIDATED HERE, which is the opposite
 * of how the URL is treated, and the difference is the point. The platform
 * console shows the environment in its header because a platform administrator
 * has the widest reach in the system and needs to know at a glance which one they
 * are pointed at. A value this script rejected would be a build that never
 * happened; a value it silently corrected would be a header that lies. So
 * whatever is set is written through verbatim, including nothing, and the console
 * narrows it at runtime - an unrecognised value renders as `Unknown` with
 * production's treatment, because an unresolvable state is treated as the most
 * dangerous one (LLD.md §3).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_VAR = 'EPM_API_BASE_URL';
const ENVIRONMENT_VAR = 'EPM_ENVIRONMENT';
const EXAMPLE_URL = 'https://api.example.com';
const APPS = ['staff', 'patient', 'platform'];

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A root .env is optional: CI and containers set the variable in the environment.
try {
  process.loadEnvFile(join(workspaceRoot, '.env'));
} catch {
  // No .env file (or an unreadable one) — fall through to process.env.
}

const raw = process.env[ENV_VAR];
const apiBaseUrl = validate(raw);
const environmentName = (process.env[ENVIRONMENT_VAR] ?? '').trim();

for (const app of APPS) {
  const directory = join(workspaceRoot, 'projects', app, 'src', 'environments');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, 'environment.generated.ts'),
    fileContents(apiBaseUrl, environmentName),
    'utf8',
  );
}

console.log(
  `[generate-environment] ${ENV_VAR}=${apiBaseUrl} ` +
    `${ENVIRONMENT_VAR}=${environmentName === '' ? '<unset>' : environmentName} ` +
    `-> ${APPS.join(', ')}`,
);

function validate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(
      `${ENV_VAR} is not set (or is empty).`,
      value === undefined ? '<unset>' : JSON.stringify(value),
    );
  }

  const candidate = value.trim();

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    fail(
      `${ENV_VAR} is not an absolute URL. It must include protocol and host; a relative path cannot be used because the apps are not served from the API origin.`,
      JSON.stringify(candidate),
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail(
      `${ENV_VAR} must use the http: or https: protocol, but it uses "${parsed.protocol}".`,
      JSON.stringify(candidate),
    );
  }

  return candidate.replace(/\/+$/, '');
}

function fail(problem, received) {
  console.error('');
  console.error(`[generate-environment] Build stopped: ${problem}`);
  console.error('');
  console.error(`  Variable: ${ENV_VAR}`);
  console.error(`  Received: ${received}`);
  console.error(`  Expected: an absolute http(s) URL, for example ${ENV_VAR}=${EXAMPLE_URL}`);
  console.error('');
  console.error('  Set it in one of these ways:');
  console.error(`    ${ENV_VAR}=${EXAMPLE_URL} npm run build`);
  console.error(`    cp .env.example .env   # then edit ${ENV_VAR} in .env`);
  console.error('');
  console.error('  See .env.example at the workspace root for documentation.');
  console.error('');
  process.exit(1);
}

function fileContents(apiBaseUrl, environmentName) {
  return [
    '// GENERATED FILE - DO NOT EDIT AND DO NOT COMMIT.',
    `// Written by scripts/generate-environment.mjs from the ${ENV_VAR} and ${ENVIRONMENT_VAR}`,
    '// environment variables on every build, start and test. It is git-ignored; edits are',
    '// overwritten.',
    `export const API_BASE_URL_VALUE = '${apiBaseUrl}';`,
    '',
    `// Whatever ${ENVIRONMENT_VAR} was set to, verbatim and unvalidated - the empty string when it`,
    '// was not set at all. The consumer narrows it; see resolveEnvironmentName in the platform',
    '// console.',
    `export const ENVIRONMENT_NAME_VALUE = '${escapeSingleQuotes(environmentName)}';`,
    '',
  ].join('\n');
}

/** Keeps an odd value from breaking out of the string literal it is written into. */
function escapeSingleQuotes(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

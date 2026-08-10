#!/usr/bin/env node
/**
 * Generates the per-application environment file that carries the API base URL.
 *
 * The API base URL is never same-origin and never relative: the staff console and
 * the patient app are deployed separately from the API (the patient app ships as a
 * Capacitor bundle served from `capacitor://`). It therefore has to be supplied at
 * build time, and a build with a missing or invalid value must fail before Angular
 * starts rather than produce a bundle that points nowhere.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_VAR = 'EPM_API_BASE_URL';
const EXAMPLE_URL = 'https://api.example.com';
const APPS = ['staff', 'patient'];

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A root .env is optional: CI and containers set the variable in the environment.
try {
  process.loadEnvFile(join(workspaceRoot, '.env'));
} catch {
  // No .env file (or an unreadable one) — fall through to process.env.
}

const raw = process.env[ENV_VAR];
const apiBaseUrl = validate(raw);

for (const app of APPS) {
  const directory = join(workspaceRoot, 'projects', app, 'src', 'environments');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'environment.generated.ts'), fileContents(apiBaseUrl), 'utf8');
}

console.log(`[generate-environment] ${ENV_VAR}=${apiBaseUrl} -> ${APPS.join(', ')}`);

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

function fileContents(apiBaseUrl) {
  return [
    '// GENERATED FILE - DO NOT EDIT AND DO NOT COMMIT.',
    '// Written by scripts/generate-environment.mjs from the EPM_API_BASE_URL environment',
    '// variable on every build, start and test. It is git-ignored; edits are overwritten.',
    `export const API_BASE_URL_VALUE = '${apiBaseUrl}';`,
    '',
  ].join('\n');
}

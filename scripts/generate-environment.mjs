#!/usr/bin/env node
/**
 * Generates the per-application environment file: the API base URL, and the name
 * of the environment the bundle is being built for.
 *
 * A DEPLOYED base URL is never same-origin and never relative: the staff console
 * and the patient app are deployed separately from the API (the patient app ships
 * as a Capacitor bundle served from `capacitor://`). It therefore has to be
 * supplied at build time, and a build with a missing or invalid value must fail
 * before Angular starts rather than produce a bundle that points nowhere.
 *
 * DEVELOPMENT IS THE ONE PLACE THAT IS SAME-ORIGIN, and it says so by setting the
 * variable to exactly `/`, which is written through as the empty string. Under
 * `ng serve` the dev server proxies `/api` to the local backend (T-92, proxy.conf.json),
 * so the browser makes a same-origin request: no preflight, and therefore no CORS
 * configuration to ask the backend for. The proxy is dev-server-only and does not
 * exist in a built bundle, which is why `/` is a local value and never a deployed one.
 *
 * `/` is accepted where the empty string is rejected, and that asymmetry is
 * deliberate. An unset variable, a blanked line in `.env` and a shell expansion
 * that produced nothing all arrive here as empty, and all three are mistakes worth
 * stopping the build for. Nothing produces `/` except somebody typing it.
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
const SAME_ORIGIN = '/';
const APPS = ['staff', 'patient', 'platform'];

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The whole of the rule about what the variable may say, as a pure function so
 * that it can be tested without running a build.
 *
 * @param {unknown} value the raw environment variable
 * @returns {{ apiBaseUrl: string } | { problem: string }} the value to write
 *   through, or why the build must stop
 */
export function resolveApiBaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return {
      problem: `${ENV_VAR} is not set (or is empty).`,
    };
  }

  const candidate = value.trim();

  // Same origin, written on purpose. Everything else here is about rejecting a
  // relative path; this is the one that is meant, and it is spelled differently
  // from "nothing was set" for exactly that reason.
  //
  // WRITTEN THROUGH AS `/`, NOT AS THE EMPTY STRING IT EVENTUALLY BECOMES. What
  // turns it into an empty base URL is `provideApiBaseUrl` in `core`, which is the
  // one place that decides what a base URL is. Normalizing it here instead would
  // hand that function the empty string, which it rejects - and rightly, since
  // that is also what an unset variable looks like by the time it gets there.
  if (candidate === SAME_ORIGIN) {
    return { apiBaseUrl: SAME_ORIGIN };
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      problem:
        `${ENV_VAR} is not an absolute URL. It must include protocol and host; a relative path ` +
        `cannot be used for a deployed build because the apps are not served from the API origin. ` +
        `The one exception is "${SAME_ORIGIN}", which means "the origin this app is served from" ` +
        `and is for \`ng serve\`, where proxy.conf.json forwards /api to the local backend.`,
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      problem: `${ENV_VAR} must use the http: or https: protocol, but it uses "${parsed.protocol}".`,
    };
  }

  return { apiBaseUrl: candidate.replace(/\/+$/, '') };
}

// Running this file is the generation; importing it is the unit test.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  generate();
}

function generate() {
  // A root .env is optional: containers and deployments set the variable in the
  // environment instead.
  try {
    process.loadEnvFile(join(workspaceRoot, '.env'));
  } catch {
    // No .env file (or an unreadable one) — fall through to process.env.
  }

  const raw = process.env[ENV_VAR];
  const resolved = resolveApiBaseUrl(raw);

  if (resolved.problem !== undefined) {
    fail(resolved.problem, raw === undefined ? '<unset>' : JSON.stringify(raw));
  }

  const { apiBaseUrl } = resolved;
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
    `[generate-environment] ${ENV_VAR}=${apiBaseUrl}${apiBaseUrl === SAME_ORIGIN ? ' (same origin, via the ng serve proxy)' : ''} ` +
      `${ENVIRONMENT_VAR}=${environmentName === '' ? '<unset>' : environmentName} ` +
      `-> ${APPS.join(', ')}`,
  );
}

function fail(problem, received) {
  console.error('');
  console.error(`[generate-environment] Build stopped: ${problem}`);
  console.error('');
  console.error(`  Variable: ${ENV_VAR}`);
  console.error(`  Received: ${received}`);
  console.error(`  Expected: an absolute http(s) URL, for example ${ENV_VAR}=${EXAMPLE_URL}`);
  console.error(
    `            or ${ENV_VAR}=${SAME_ORIGIN} for local development behind the ng serve proxy`,
  );
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
    '',
    `// The API base URL, as ${ENV_VAR} gave it. \`${SAME_ORIGIN}\` MEANS SAME ORIGIN: \`provideApiBaseUrl\``,
    '// resolves it to an empty base URL, which is how `ng serve` reaches the backend through',
    '// proxy.conf.json without CORS. Any other value is an absolute http(s) URL with its trailing',
    '// slash removed.',
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

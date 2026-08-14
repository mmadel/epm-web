#!/usr/bin/env node
/**
 * The development proxy is wired into EVERY application, not into one of them.
 *
 * `ng serve` forwards `/api` to the local backend, so a request from the browser is
 * same-origin: no preflight, and therefore no CORS configuration to ask the backend
 * for (T-92). That only holds for an application whose `serve` target actually
 * references the proxy, and nothing in the toolchain says otherwise when one does
 * not - `ng serve patient` starts perfectly happily and the first API call fails at
 * preflight, days later, on somebody else's machine.
 *
 * TWO FILES, AND THE SPLIT IS THE POINT. `proxy.conf.json` is the configuration:
 * the rule, the target, the port, and the only place any of them is written.
 * `proxy.conf.mjs` is what `serve` references; it re-exports those rules with an
 * error handler attached, because this workspace's dev server is Vite and Vite
 * reports a refused connection without saying where it was connecting to. So this
 * check has both to make: the rules are the one rule they should be, and every
 * application goes through the wrapper rather than around it.
 *
 * There is no automated test for a dev-server proxy: it is `ng serve`
 * configuration and does not exist in a test build or in a bundle. What CAN be
 * checked is what the repository says, which is what this does, in the same spirit
 * and the same lint step as the API specification pin.
 *
 * It also holds the proxy to ONE rule. `/api` is all anything needs; assets and
 * websockets are served by the dev server itself, and a speculative rule for them
 * is a rule nobody can test and everybody inherits.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** What `serve` references: the wrapper, which is what makes a failure legible. */
export const PROXY_FILE = 'proxy.conf.mjs';

/** Where the rules themselves live, and the only place the target is written. */
export const RULES_FILE = 'proxy.conf.json';

export const API_PREFIX = '/api';

/**
 * @param {unknown} angularJson the parsed angular.json
 * @returns {string[]} one problem per application that serves without the proxy
 */
export function unproxiedServeTargets(angularJson) {
  const projects = angularJson?.projects ?? {};

  // Driven by "has a serve target" rather than by a list of the three application
  // names. A fourth application added later is covered the day it can be served,
  // without anybody remembering this file exists.
  return Object.entries(projects)
    .filter(([, project]) => project?.architect?.serve !== undefined)
    .filter(([, project]) => project.architect.serve.options?.proxyConfig !== PROXY_FILE)
    .map(([name, project]) => {
      const configured = project.architect.serve.options?.proxyConfig;

      if (configured === undefined) {
        return `"${name}" can be served but does not reference ${PROXY_FILE}, so its /api requests would go cross-origin and fail at preflight.`;
      }

      // The likely mistake, and it half-works, which is the problem: the rules are
      // right and the proxy forwards, but a refused connection is reported without
      // naming the target and reads as a broken application.
      return configured === RULES_FILE
        ? `"${name}" references ${RULES_FILE} directly rather than ${PROXY_FILE}. The rules are the same either way, but only the wrapper names ${RULES_FILE}'s target when the backend is not running.`
        : `"${name}" references "${configured}" rather than ${PROXY_FILE}. One proxy file, so the applications cannot drift apart.`;
    });
}

/**
 * @param {unknown} proxyConfig the parsed proxy.conf.json
 * @returns {string[]} why the proxy is not the one rule it should be, if it is not
 */
export function whyProxyIsWrong(proxyConfig) {
  if (proxyConfig === null || typeof proxyConfig !== 'object' || Array.isArray(proxyConfig)) {
    return [`${RULES_FILE} must be an object of proxy rules.`];
  }

  const rules = Object.keys(proxyConfig);

  if (!rules.includes(API_PREFIX)) {
    return [
      `${RULES_FILE} has no "${API_PREFIX}" rule, which is the only reason it exists. It has: ${rules.length === 0 ? 'nothing' : rules.join(', ')}.`,
    ];
  }

  const problems = [];

  if (rules.length > 1) {
    problems.push(
      `${RULES_FILE} proxies more than ${API_PREFIX}: ${rules.join(', ')}. One rule until a second is genuinely needed - the dev server serves assets itself.`,
    );
  }

  const target = proxyConfig[API_PREFIX]?.target;

  if (typeof target !== 'string' || !/^https?:\/\/.+/.test(target)) {
    problems.push(
      `The "${API_PREFIX}" rule needs an absolute http(s) target naming the local backend, but has ${JSON.stringify(target ?? null)}. It is what the proxy names in its connection error when the backend is not running, which is how a developer tells "backend is down" from "the app is broken".`,
    );
  }

  return problems;
}

// Running this file is the check; importing it is the unit test.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const problems = run();

  if (problems.length > 0) {
    console.error('');
    for (const problem of problems) {
      console.error(`Development proxy check failed: ${problem}`);
      console.error('');
    }
    process.exit(1);
  }

  console.log(
    `Development proxy check passed: every serve target forwards ${API_PREFIX} through ${PROXY_FILE}.`,
  );
}

function run() {
  let angularJson;
  let proxyConfig;

  try {
    angularJson = JSON.parse(readFileSync(join(workspaceRoot, 'angular.json'), 'utf8'));
  } catch (error) {
    return [`angular.json could not be read: ${error.message}`];
  }

  try {
    proxyConfig = JSON.parse(readFileSync(join(workspaceRoot, RULES_FILE), 'utf8'));
  } catch (error) {
    return [
      `${RULES_FILE} could not be read: ${error.message}\n` +
        '  It belongs at the workspace root and is what makes `ng serve` reach the API without CORS.',
    ];
  }

  if (!existsSync(join(workspaceRoot, PROXY_FILE))) {
    return [
      `${PROXY_FILE} is missing, and it is what every serve target references.\n` +
        `  It re-exports ${RULES_FILE}'s rules with the error handler that names the target when the backend is down.`,
    ];
  }

  return [...whyProxyIsWrong(proxyConfig), ...unproxiedServeTargets(angularJson)];
}

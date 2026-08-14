// The two judgements in check-proxy.mjs, exercised on parsed configuration.
//
// The check itself reads angular.json and proxy.conf.json, which a unit test
// cannot vary. What it can vary is what those files might say - and the failure
// worth catching is the quiet one: a workspace where the proxy is wired into the
// application somebody was working on and not into the other two, which looks
// completely fine until a different application makes its first API call.

const test = require('node:test');
const assert = require('node:assert/strict');

const checker = import('./check-proxy.mjs');

const served = (proxyConfig) => ({
  architect: { serve: proxyConfig === undefined ? {} : { options: { proxyConfig } } },
});

const library = { architect: { build: {} } };

test('every application that can be served must reference the proxy file', async () => {
  const { unproxiedServeTargets } = await checker;

  const wired = {
    projects: {
      staff: served('proxy.conf.mjs'),
      patient: served('proxy.conf.mjs'),
      platform: served('proxy.conf.mjs'),
      core: library,
    },
  };

  assert.deepEqual(unproxiedServeTargets(wired), []);
});

test('one application left out is the failure this check exists for', async () => {
  const { unproxiedServeTargets } = await checker;

  const problems = unproxiedServeTargets({
    projects: {
      staff: served('proxy.conf.mjs'),
      patient: served(undefined),
      platform: served('proxy.conf.mjs'),
    },
  });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /"patient"/);
  assert.match(problems[0], /preflight/);
});

test('a second proxy file is drift, not wiring', async () => {
  const { unproxiedServeTargets } = await checker;

  const problems = unproxiedServeTargets({
    projects: { staff: served('projects/staff/proxy.conf.mjs') },
  });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /projects\/staff\/proxy\.conf\.mjs/);
});

test('referencing the rules directly, without the wrapper, is reported as such', async () => {
  const { unproxiedServeTargets } = await checker;

  // The half-working case: the rules are right and requests are forwarded, so it
  // looks correct until the day the backend is down and the error names nothing.
  const problems = unproxiedServeTargets({ projects: { staff: served('proxy.conf.json') } });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /names proxy\.conf\.json's target/);
});

test('a library has no serve target and is not asked for a proxy', async () => {
  const { unproxiedServeTargets } = await checker;

  assert.deepEqual(unproxiedServeTargets({ projects: { core: library, ui: library } }), []);
});

test('the proxy forwards /api to an absolute http(s) backend', async () => {
  const { whyProxyIsWrong } = await checker;

  assert.deepEqual(
    whyProxyIsWrong({
      '/api': { target: 'http://localhost:8080', secure: false, changeOrigin: true },
    }),
    [],
  );
});

test('a proxy with no /api rule is not a proxy', async () => {
  const { whyProxyIsWrong } = await checker;

  const problems = whyProxyIsWrong({ '/assets': { target: 'http://localhost:8080' } });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /no "\/api" rule/);
});

test('a second rule is reported, so the proxy stays the one thing it is', async () => {
  const { whyProxyIsWrong } = await checker;

  const problems = whyProxyIsWrong({
    '/api': { target: 'http://localhost:8080' },
    '/ws': { target: 'http://localhost:8080' },
  });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /\/ws/);
});

test('a target that is not an absolute http(s) URL is reported', async () => {
  const { whyProxyIsWrong } = await checker;

  // A relative or host-only target is the version of this mistake that starts the
  // dev server and fails at the first request, with a message about the target
  // rather than about the backend.
  for (const target of ['localhost:8080', '/api', '', undefined]) {
    const problems = whyProxyIsWrong({ '/api': { target } });

    assert.equal(problems.length, 1, `${JSON.stringify(target)} must be reported`);
    assert.match(problems[0], /absolute http\(s\) target/);
  }
});

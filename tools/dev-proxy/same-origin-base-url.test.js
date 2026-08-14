// What `EPM_API_BASE_URL` is allowed to say, exercised on strings.
//
// The generator writes files from the environment, which a unit test cannot vary
// usefully. Its judgement is what matters here, and specifically ONE asymmetry:
// `/` is accepted and the empty string is not. They resolve to the same base URL,
// so it reads like an oversight and is the opposite - an unset variable, a blanked
// line in a `.env` and a shell expansion that produced nothing all arrive as
// empty, and a build that silently pointed those at the app's own origin would
// 404 every request in whichever environment it reached.

const test = require('node:test');
const assert = require('node:assert/strict');

const generator = import('../../scripts/generate-environment.mjs');

test('"/" means the origin the app is served from, and is written through as "/"', async () => {
  const { resolveApiBaseUrl } = await generator;

  // WRITTEN THROUGH, NOT NORMALIZED. It is `provideApiBaseUrl` in `core` that
  // turns it into an empty base URL, because that is the one place that decides
  // what a base URL is - and it rejects the empty string, so a value pre-empties
  // here would arrive there as a rejected build. `core`'s own spec is what asserts
  // the resolution.
  assert.deepEqual(resolveApiBaseUrl('/'), { apiBaseUrl: '/' });
  assert.deepEqual(resolveApiBaseUrl('  /  '), { apiBaseUrl: '/' });
});

test('nothing at all is still a stopped build', async () => {
  const { resolveApiBaseUrl } = await generator;

  for (const nothing of [undefined, null, '', '   ']) {
    const { problem } = resolveApiBaseUrl(nothing);

    assert.match(problem ?? '', /is not set/, `${JSON.stringify(nothing)} must stop the build`);
  }
});

test('an absolute http(s) URL passes, with its trailing slash removed', async () => {
  const { resolveApiBaseUrl } = await generator;

  assert.deepEqual(resolveApiBaseUrl('https://api.example.com'), {
    apiBaseUrl: 'https://api.example.com',
  });
  assert.deepEqual(resolveApiBaseUrl('https://api.example.com/v1/'), {
    apiBaseUrl: 'https://api.example.com/v1',
  });
  assert.deepEqual(resolveApiBaseUrl('http://localhost:8080'), {
    apiBaseUrl: 'http://localhost:8080',
  });
});

test('a relative path other than "/" is rejected, and the message says why', async () => {
  const { resolveApiBaseUrl } = await generator;

  for (const relative of ['/api', './api', '//api.example.com', 'api.example.com']) {
    const { problem } = resolveApiBaseUrl(relative);

    assert.match(problem ?? '', /not an absolute URL/, `${relative} must be rejected`);
    // The exception is named in the message, because a developer who wanted same
    // origin and wrote the intuitive thing is exactly who reads it.
    assert.match(problem ?? '', /ng serve/);
  }
});

test('a protocol that is not http(s) is rejected', async () => {
  const { resolveApiBaseUrl } = await generator;

  const { problem } = resolveApiBaseUrl('ftp://api.example.com');

  assert.match(problem ?? '', /http: or https:/);
});

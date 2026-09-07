// What `EPM_AUTH_ISSUER_BASE_URL` is allowed to say, exercised on strings.
//
// It is the API base URL's rule with the one exception taken out, and the missing
// exception is the whole reason this file exists beside the other one. `/` means
// "the origin this app is served from", which is a real answer for the API - the
// dev server proxies /api to it - and is never an answer for the identity
// provider, which is its own server on its own port in every environment there
// has been. A console that accepted `/` here would fetch its own index.html
// looking for a discovery document and fail with something about JSON.

const test = require('node:test');
const assert = require('node:assert/strict');

const generator = import('../../scripts/generate-environment.mjs');

test('an absolute http(s) URL passes, with its trailing slash removed', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  // THE TRAILING SLASH MATTERS MORE HERE THAN ANYWHERE ELSE IN THE WORKSPACE.
  // The realm is appended to this, and the result is compared to the `iss` claim
  // character for character (LLD-INFRASTRUCTURE.md #I5). A slash left on turns
  // `.../realms/epm-platform` into `...//realms/epm-platform`, which resolves,
  // fetches a discovery document, mints a token and has it refused.
  assert.deepEqual(resolveAuthIssuerBaseUrl('http://localhost:8180'), {
    authIssuerBaseUrl: 'http://localhost:8180',
  });
  assert.deepEqual(resolveAuthIssuerBaseUrl('http://localhost:8180/'), {
    authIssuerBaseUrl: 'http://localhost:8180',
  });
  assert.deepEqual(resolveAuthIssuerBaseUrl('  https://id.example.com//  '), {
    authIssuerBaseUrl: 'https://id.example.com',
  });
});

test('nothing at all stops the build', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  // There is deliberately no default. A console that guessed its provider would
  // send somebody's credentials to a host nobody chose.
  for (const nothing of [undefined, null, '', '   ']) {
    const { problem } = resolveAuthIssuerBaseUrl(nothing);

    assert.match(problem ?? '', /is not set/, `${JSON.stringify(nothing)} must stop the build`);
  }
});

test('"/" is rejected, unlike the API base URL, and the message says why', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  const { problem } = resolveAuthIssuerBaseUrl('/');

  assert.match(problem ?? '', /not an absolute URL/);
  // The asymmetry with EPM_API_BASE_URL is named in the message, because somebody
  // who copied the line above it in `.env` is exactly who reads this.
  assert.match(problem ?? '', /EPM_API_BASE_URL/);
  assert.match(problem ?? '', /never the origin/);
});

test('any other relative path is rejected too', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  for (const relative of ['/auth', './realms', 'id.example.com']) {
    const { problem } = resolveAuthIssuerBaseUrl(relative);

    assert.match(problem ?? '', /not an absolute URL/, `${relative} must be rejected`);
  }
});

test('a host with a port but no protocol is rejected, as a protocol', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  // `localhost:8180` is the value somebody writes when they mean the local
  // Keycloak, and it is REJECTED FOR A REASON THAT READS ODDLY: `new URL` parses
  // it, treating `localhost:` as the scheme and `8180` as the path. It is caught
  // either way, which is what matters; this is here so the odd wording is on the
  // record as understood rather than found again by whoever hits it.
  const { problem } = resolveAuthIssuerBaseUrl('localhost:8180');

  assert.match(problem ?? '', /http: or https:/);
});

test('a protocol that is not http(s) is rejected', async () => {
  const { resolveAuthIssuerBaseUrl } = await generator;

  const { problem } = resolveAuthIssuerBaseUrl('ftp://id.example.com');

  assert.match(problem ?? '', /http: or https:/);
});

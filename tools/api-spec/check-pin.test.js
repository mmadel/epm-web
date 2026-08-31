// The two judgements in check-pin.mjs, exercised on strings.
//
// The check itself reads package.json and every tracked file, which a unit test
// cannot vary. What it can vary is what those files might contain - and both
// judgements are the kind that look obviously right and are quietly wrong at the
// edges: `0.1.0-SNAPSHOT.63` is one version and must pass, `>=0.1.0 <0.2.0` is
// two and must not, and a README explaining that tokens start with `ghp_` must
// not be mistaken for a token.

const test = require('node:test');
const assert = require('node:assert/strict');

const checker = import('./check-pin.mjs');

// The fixtures are ASSEMBLED rather than written out, because the check they
// exercise scans every tracked file - including this one - and a token-shaped
// string spelled in full here would fail it. Excluding this file from the scan
// instead would leave exactly the kind of hole the check exists to close.
const BODY = '0123456789abcdefghijklmnopqrstuvwxyz';
const token = (prefix) => prefix + '_' + BODY;

test('whyNotExact accepts exactly one version', async () => {
  const { whyNotExact } = await checker;

  for (const exact of ['0.1.0', '1.0.0', '0.1.0-SNAPSHOT.63', '2.3.4-rc.1', '1.2.3+build.5']) {
    assert.equal(whyNotExact(exact), null, `${exact} is one version`);
  }
});

test('whyNotExact rejects anything that is not one version', async () => {
  const { whyNotExact } = await checker;

  const notOneVersion = [
    '^0.1.0', // the default npm writes, and the reason -E exists
    '~0.1.0',
    '>=0.1.0',
    '0.1.x',
    '*',
    '',
    'latest',
    'next',
    '>=0.1.0 <0.2.0',
    '0.1.0 || 0.2.0',
    'npm:@mmadel/openapi-spec@0.1.0',
    'github:mmadel/epm-service',
    'file:../epm-service/openapi',
    'https://example.com/openapi-spec.tgz',
  ];

  for (const version of notOneVersion) {
    assert.notEqual(whyNotExact(version), null, `${version || '(empty)'} is not one version`);
  }

  // A missing dependency reads differently from a badly specified one, and the
  // message says so.
  assert.match(whyNotExact(undefined), /no version at all/);
});

test('containsTokenLiteral finds every GitHub token prefix', async () => {
  const { containsTokenLiteral } = await checker;

  const tokens = [
    token('ghp'), // classic personal access token - the kind this workspace uses
    token('gho'),
    token('ghs'),
    token('ghu'),
    token('ghr'),
    'github' + '_pat_' + BODY + '_' + BODY, // fine-grained
  ];

  for (const literal of tokens) {
    assert.equal(containsTokenLiteral(literal), true, literal.slice(0, 12));
    // The likelier accident than a bare token on its own line.
    assert.equal(containsTokenLiteral(`//npm.pkg.github.com/:_authToken=${literal}\n`), true);
  }
});

test('containsTokenLiteral leaves the committed configuration and its prose alone', async () => {
  const { containsTokenLiteral } = await checker;

  const innocent = [
    '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}',
    '@mmadel:registry=https://npm.pkg.github.com',
    'A classic token starts with ghp_ and a fine-grained one with github_pat_.',
    'export NODE_AUTH_TOKEN=<token>',
  ];

  for (const line of innocent) {
    assert.equal(containsTokenLiteral(line), false, line);
  }
});

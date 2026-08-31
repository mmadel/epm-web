#!/usr/bin/env node
/**
 * Runs before every install (`preinstall`), and stops with an explanation when
 * the token needed to read `@mmadel/openapi-spec` is not in the environment.
 *
 * The specification this workspace generates its client from is published to
 * GitHub Packages, which requires authentication even for a package anyone may
 * read. Without a token, npm resolves `${NODE_AUTH_TOKEN}` in .npmrc to nothing
 * and the registry answers 401 - or, once a token exists but cannot read that
 * repository, 404, which says the package does not exist. It does exist. Neither
 * message contains the word this file exists to say, which is the name of the
 * variable nobody set.
 *
 * WHAT IT DOES NOT CATCH, because npm does not offer a hook early enough:
 * `npm ci` downloads dependencies BEFORE it runs the root package's `preinstall`
 * script. On a cold cache - which any developer who has not installed this
 * package before has - the registry therefore answers 401 and npm exits before
 * this file executes. Measured, not assumed: a cold-cache `npm ci` with the
 * variable unset prints the bare 401 and nothing from here.
 *
 * So `preinstall` is where it is wired: it catches the warm-cache case and
 * `npm install` on a populated tree - the shape a developer hits most often,
 * since their cache usually has the package from last time. Ahead of a cold
 * `npm ci`, running this file by hand is the only position that reliably
 * precedes npm's first request.
 *
 * When it does not fire, the fallback is documentation: the 401 row in
 * docs/api-client.md says what the registry will not.
 *
 * The check is deliberately narrow. It asks whether the token is in the
 * environment, not whether it works: a revoked or under-scoped token is npm's
 * error to report, and a guard that tried to validate one would need the network
 * before `npm ci` has run.
 *
 * It has no exception for a node_modules that already contains the package.
 * There was one, briefly, so that `npm install <something-else>` against a
 * populated tree would not need a token it might not use - but `npm ci` empties
 * node_modules as part of the same command this hook belongs to, which makes
 * "is it already installed?" a question whose answer depends on when it is
 * asked. A guard that is sometimes skipped is worse than no guard: it is a guard
 * people stop reading failures from.
 */

const token = (process.env.NODE_AUTH_TOKEN ?? '').trim();

if (token === '') {
  console.error('');
  console.error('[check-packages-token] Stopped: NODE_AUTH_TOKEN is not set.');
  console.error('');
  console.error(
    [
      'This workspace installs @mmadel/openapi-spec - the OpenAPI specification it',
      'generates its API client from - from GitHub Packages (npm.pkg.github.com,',
      'see .npmrc), and that registry authenticates every read.',
      '',
      'It needs a classic personal access token with `read:packages`, exported:',
      '',
      '  $env:NODE_AUTH_TOKEN = "<token>"   # PowerShell',
      '  export NODE_AUTH_TOKEN=<token>     # bash',
      '',
      'Putting it in ~/.npmrc instead will NOT work: the committed .npmrc sets the',
      "same key for this registry, and a project's configuration beats the user's,",
      'so the file is shadowed and npm authenticates with nothing.',
    ].join('\n  '),
  );
  console.error('');
  process.exit(1);
}

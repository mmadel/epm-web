/**
 * The rules in `proxy.conf.json`, plus the one thing a JSON file cannot carry: an
 * error handler that names the target when the backend is not running.
 *
 * WHY THIS FILE EXISTS AT ALL. `proxy.conf.json` is the configuration - the rule,
 * the target, the port - and it stays the only place any of that is written. But
 * this workspace serves with `@angular/build:dev-server`, which is Vite, and Vite's
 * proxy reports a refused connection as:
 *
 *     [vite] http proxy error: /api/v1/platform/plans
 *     AggregateError [ECONNREFUSED]
 *
 * - the path that failed and nothing about where it was going. (`logLevel` in the
 * JSON is webpack-dev-server's vocabulary and is ignored here, which is the other
 * half of the same gap.) A developer reading that has no way to tell "the backend
 * is not running" from "the app is broken", and T-92 §11 is explicit that a failure
 * which does not name the target does not meet its criterion 6.
 *
 * So: one hook, which prints the target and what to do about it. Everything else
 * comes from the JSON, unread and unmodified by this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(here, 'proxy.conf.json'), 'utf8'));

export default Object.fromEntries(
  Object.entries(rules).map(([prefix, rule]) => [
    prefix,
    {
      ...rule,
      configure(proxy) {
        proxy.on('error', (error, request) => {
          // `error.code` is ECONNREFUSED for "nothing is listening", which is the
          // case worth wording. Anything else is printed as it came, because a
          // guess at what it means would be worse than the message.
          const refused =
            error.code === 'ECONNREFUSED' || error.errors?.[0]?.code === 'ECONNREFUSED';

          console.error(
            `\n[proxy] ${request.method} ${request.url} -> ${rule.target} failed: ${error.code ?? error.message}`,
          );
          if (refused) {
            console.error(
              `[proxy] Nothing is listening on ${rule.target}. The app is fine; the backend is not running.\n` +
                '[proxy] Start it with `.\\mvnw.cmd spring-boot:run`, or change the target in proxy.conf.json.\n',
            );
          }
        });
      },
    },
  ]),
);

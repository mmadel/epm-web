import { EnvironmentProviders, makeEnvironmentProviders, signal } from '@angular/core';

import { PlatformAdminSession } from './session';
import { SESSION_SOURCE, SessionSource } from './session-source';

/**
 * The platform administrator the mock signs in.
 *
 * Exported so tests can assert against it by reference instead of retyping the
 * literal, and so a fixture that needs a different name can start from it.
 */
export const MOCK_PLATFORM_ADMIN: PlatformAdminSession = {
  actor: 'platformAdmin',
  userId: 'mock-platform-admin',
  displayName: 'Platform Admin',
};

/**
 * Signs in a platform administrator, without asking anybody to sign in.
 *
 * This is the "a mock implements it today" half of the session seam. When the
 * identity provider arrives, an application swaps this one call for that one and
 * nothing downstream changes - no feature, guard or component knows which
 * implementation answered. That is what "swapping them is configuration" has to
 * mean to be worth building a seam for.
 *
 * It lives here beside the interface rather than inside `projects/platform` so
 * the swap stays a single line in `app.config.ts`, and so no feature is ever
 * able to reach past the seam and import a mock directly.
 *
 * @param admin The administrator to sign in. Defaults to
 *   {@link MOCK_PLATFORM_ADMIN}; override it to drive a screenshot or a fixture.
 */
export function providePlatformAdminSession(
  admin: PlatformAdminSession = MOCK_PLATFORM_ADMIN,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SESSION_SOURCE,
      // A factory rather than a value, so each injector - and so each test -
      // gets its own signal instead of sharing one created when this module was
      // first evaluated.
      useFactory: (): SessionSource => ({ session: signal(admin).asReadonly() }),
    },
  ]);
}

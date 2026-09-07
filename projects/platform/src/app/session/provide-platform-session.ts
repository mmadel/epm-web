import { computed, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CONSOLE_AUTH, PlatformAdminSession, SESSION_SOURCE, SessionSource } from 'core';

/**
 * Who is signed in, for a console that only ever signs in platform
 * administrators.
 *
 * THE ACTOR KIND IS NOT READ OUT OF THE TOKEN, and that is the whole reason this
 * lives here rather than in `core` beside the OIDC wiring.
 * `LLD-INFRASTRUCTURE.md` §I9 says claims are not read to make decisions, and
 * "which kind of actor is this" is a decision. It does not need a claim: this
 * console signs in against the `epm-platform` realm with the `platform-console`
 * client, so anybody holding a token it accepts signed in HERE, and the kind of
 * actor that describes is a fact about the application rather than about the
 * person.
 *
 * WHAT IT IS NOT is authorization. It says what sort of session this is, so that
 * `platformAdminGuard` and the frame have something to read; what a platform
 * administrator may actually do comes back from the API, which resolves the token
 * to a row and answers 403 when there is none (T-111 §5, criterion 10).
 *
 * THERE IS NO STAFF EQUIVALENT AND THAT IS NOT AN OVERSIGHT. An
 * `OrganizationMemberSession` needs an organization id; the only place a console
 * could get one without asking the API is the token, which is exactly what §I9
 * forbids. The staff console signs in and holds no session until a route exists
 * that tells it whose practice it is looking at - see T-111 §3.
 */
export function providePlatformSession(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SESSION_SOURCE,
      useFactory: (): SessionSource => {
        const auth = inject(CONSOLE_AUTH);

        return {
          session: computed<PlatformAdminSession | undefined>(() => {
            const user = auth.user();

            // `undefined` all the way through rather than a session with empty
            // strings in it. Nobody is signed in yet is a state the seam has a
            // word for, and a placeholder administrator would render a frame with
            // somebody's name missing from it instead of no frame at all.
            return user === undefined
              ? undefined
              : {
                  actor: 'platformAdmin',
                  userId: user.userId,
                  displayName: user.displayName,
                };
          }),
        };
      },
    },
  ]);
}

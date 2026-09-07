import { computed, DOCUMENT, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EventTypes, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { Observable } from 'rxjs';

import { AuthStatus, AuthUser, ConsoleAuth } from './console-auth';

/**
 * Where the console was when it decided to send for the provider.
 *
 * IN `sessionStorage`, WHICH IS NOT THE THING CRITERION 13 IS ABOUT. That
 * criterion is about the token, and this is a path - the one the browser was
 * asked for before it went to Keycloak. It has to survive a full page load away
 * and back, so a field on this class cannot hold it, and it has to be gone when
 * the tab is, so `localStorage` must not.
 */
const RETURN_TO = 'epm.auth.return-to';

/**
 * What the console signs in against.
 *
 * The issuer is the one string in here that has to be exactly right.
 * `LLD-INFRASTRUCTURE.md` §I5: it is compared character for character against the
 * `iss` claim, and a value that differs by a trailing slash produces tokens that
 * verify and are refused anyway - which reads, from the console, as sign-in
 * working and the API rejecting everything.
 */
export interface OidcConsoleAuthConfig {
  /** The issuer, exactly as its `.well-known` document spells it. */
  readonly issuer: string;

  /** This console's public client. `platform-console`, or `staff-console`. */
  readonly clientId: string;
}

/**
 * {@link ConsoleAuth} over `angular-auth-oidc-client` (see `DECISIONS.md`).
 *
 * IT OWNS THE STATE MACHINE AND THE LIBRARY OWNS THE PROTOCOL, and the split is
 * deliberate: PKCE, the code exchange, silent renew, storage and clock skew are
 * the four places T-111 says are easy to be subtly wrong in, and none of them is
 * written here. What is written here is the six states a person can see, because
 * the library has no opinion about those and drawing them is the whole ticket.
 *
 * NOT `@Injectable`, AND CONSTRUCTED BY HAND IN A FACTORY. Its configuration is
 * an interface, which is a type and not an injection token, so Angular has
 * nothing to resolve the constructor parameter from. `provideOidcAuth` builds it
 * inside a `useFactory`, which is an injection context - so every `inject()`
 * below still works, and `takeUntilDestroyed()` still finds a `DestroyRef`.
 *
 * SIGNING IN IS DECIDED ONCE, AT START, AND NOWHERE ELSE. Not in the guard, not
 * in a component, not per navigation. There is one moment where "no session"
 * becomes "go to the provider", and it is the moment the deep link the browser
 * was opened with is still readable - which is what carries it through the round
 * trip (criterion 8).
 */
export class OidcConsoleAuth implements ConsoleAuth {
  private readonly oidc = inject(OidcSecurityService);
  private readonly events = inject(PublicEventsService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly state = signal<AuthStatus>('starting');

  readonly status = this.state.asReadonly();
  readonly issuer: string;

  /**
   * The signed-in person, from the id_token's claims, for display only.
   *
   * `autoUserInfo` is off (see `provide-oidc-auth.ts`), so the library fills its
   * `userData` from the decoded id_token rather than from a call to the
   * provider's userinfo endpoint. Two reasons, and the second is the one that
   * decided it: there is nothing in userinfo this console wants that the id_token
   * does not already carry, and that call would put `Authorization: Bearer` on a
   * request to Keycloak - which is protocol-correct and indistinguishable, in the
   * network tab, from the leak criterion 4 exists to rule out.
   *
   * NO CLAIM HERE IS READ TO DECIDE ANYTHING (`LLD-INFRASTRUCTURE.md` §I9). A
   * name to put in a header and a `sub` to identify a row; no role, no `org_id`.
   */
  readonly user = computed<AuthUser | undefined>(() => {
    const claims = this.oidc.userData().userData as Record<string, unknown> | null | undefined;

    if (claims === null || claims === undefined) {
      return undefined;
    }

    const sub = text(claims['sub']);

    if (sub === '') {
      return undefined;
    }

    // `name` is what Keycloak sends when the account has one; `preferred_username`
    // is what every account has. A header showing a raw `sub` would be a UUID
    // where a person's name goes, so the fallback is the username rather than the
    // identifier.
    return {
      userId: sub,
      displayName: text(claims['name']) || text(claims['preferred_username']) || sub,
    };
  });

  /** Whether the console has already been sent back to the provider once. */
  private hasRedirected = false;

  constructor(config: OidcConsoleAuthConfig) {
    this.issuer = config.issuer;

    this.events
      .registerForEvents()
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        // The provider's discovery document did not load. It is reported as an
        // event rather than through `checkAuth`, so both have to be watched or
        // "Keycloak is not running" renders as a blank page (criterion 11).
        if (event.type === EventTypes.ConfigLoadingFailed) {
          this.state.set('providerUnreachable');
        }

        // A refresh that failed ends the session. IT DOES NOT RETRY - T-111 §5.4.
        // The library's own retry has already run by the time this fires; a second
        // one here would be a console that never stops asking for a token the
        // provider has already declined to mint.
        if (event.type === EventTypes.SilentRenewFailed) {
          this.sessionEnded();
        }
      });

    this.start();
  }

  accessToken(): Observable<string> {
    return this.oidc.getAccessToken();
  }

  signOut(): void {
    // `logoff` and not `logoffLocal`: ending the session HERE only would leave
    // Keycloak's own session open, and reopening the console would sign the person
    // straight back in without asking for anything. That is criterion 7, and it is
    // the difference between signing out and clearing a cache.
    this.oidc.logoff().subscribe();
  }

  sessionEnded(): void {
    this.oidc.logoffLocal();
    this.toProvider();
  }

  refuse(): void {
    // NO `authorize()`. The token was good; its owner is not on the list. Signing
    // in again returns the same token and the same 403, which is a loop between
    // two servers that both answered correctly (criterion 10).
    this.state.set('notPermitted');
  }

  /**
   * Restores a session if there is one, and otherwise sends for the provider.
   *
   * `checkAuth` does both halves of the return trip: on a callback URL it
   * exchanges the code, and on any other URL it reads what storage still holds.
   * Which of the two is happening is only visible in the address, and it is worth
   * distinguishing because they look different to somebody watching - one is a
   * page that has just come back from a login screen, the other is a page that
   * has just been opened.
   */
  private start(): void {
    if (isCallback(this.document.location?.search ?? '')) {
      this.state.set('signingIn');
    } else {
      // Remembered BEFORE anything can navigate. This is the address the browser
      // was actually opened with, which after the round trip through Keycloak is
      // no longer recoverable from anywhere else (criterion 8).
      this.remember(currentPath(this.document));
    }

    this.oidc.checkAuth().subscribe({
      next: ({ isAuthenticated }) => {
        if (isAuthenticated) {
          this.signedIn();
        } else {
          this.toProvider();
        }
      },
      // Anything that stopped the exchange or the discovery: a refused connection,
      // a realm that does not exist, a provider answering something that is not a
      // configuration document.
      error: () => this.state.set('providerUnreachable'),
    });
  }

  /**
   * The token is in hand: render the shell, and go where the person was going.
   *
   * THE NAVIGATION IS NOT OPTIONAL EVEN WHEN THERE IS NOWHERE TO GO. The router's
   * first navigation ran while this was still `starting`, so the guard refused it
   * and nothing is activated; without a navigation here the console would sit on a
   * splash with a valid token, which is the one bug this arrangement can produce.
   */
  private signedIn(): void {
    this.state.set('signedIn');

    const returnTo = this.forget();

    void this.router.navigateByUrl(returnTo ?? currentPath(this.document));
  }

  /**
   * Back to the login redirect.
   *
   * ONCE PER LOAD OF THE CONSOLE. A 401 that survives a fresh sign-in means the
   * provider is minting tokens this API will not take - the audience is wrong, or
   * the realm is - and neither server will change its mind. Redirecting a second
   * time turns a configuration fault into a tab that flickers between two origins
   * and cannot be read long enough to diagnose.
   */
  private toProvider(): void {
    if (this.hasRedirected) {
      this.state.set('providerUnreachable');

      return;
    }

    this.hasRedirected = true;
    this.state.set('redirecting');
    this.oidc.authorize();
  }

  private remember(path: string): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(RETURN_TO, path);
    } catch {
      // A browser with storage switched off signs in perfectly well and lands on
      // the console's home instead of the deep link. That is a worse landing, not
      // a broken one, and it is not worth failing sign-in over.
    }
  }

  private forget(): string | undefined {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      const path = storage?.getItem(RETURN_TO) ?? undefined;

      storage?.removeItem(RETURN_TO);

      return path;
    } catch {
      return undefined;
    }
  }
}

/**
 * Whether this page load is the return from the provider.
 *
 * `code` AND `state` together, because either alone is a query parameter a screen
 * in this console is free to use for its own purposes - the practice list already
 * keeps its search in the address.
 */
function isCallback(search: string): boolean {
  const parameters = new URLSearchParams(search);

  return parameters.has('code') && parameters.has('state');
}

/** The address the browser is at, as the router would spell it. */
function currentPath(document: Document): string {
  const location = document.location;

  return `${location?.pathname ?? '/'}${location?.search ?? ''}${location?.hash ?? ''}`;
}

/** A claim as a string, or `''` for anything that is not one. */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

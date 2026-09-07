import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { authenticatedGuard } from './authenticated-guard';
import { AuthStatus } from './console-auth';
import { provideStubAuth } from './provide-stub-auth';

// The guard reads neither argument - it asks the auth seam and nothing else - so
// there is nothing to build here beyond satisfying the signature.
const ROUTE = {} as ActivatedRouteSnapshot;
const STATE = {} as RouterStateSnapshot;

function runWith(status: AuthStatus) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideStubAuth({ status })] });

  return TestBed.runInInjectionContext(() => authenticatedGuard(ROUTE, STATE));
}

describe('authenticatedGuard', () => {
  it('allows a signed-in caller', () => {
    expect(runWith('signedIn')).toBe(true);
  });

  it('refuses in every other state', () => {
    // NAMED ONE BY ONE RATHER THAN AS "NOT SIGNED IN". The union has six members
    // and five of them must refuse; listing them is what makes a seventh state
    // added later show up here as a missing case rather than as a silent `false`
    // that happens to be right until it is not.
    const refused: AuthStatus[] = [
      'starting',
      'redirecting',
      'signingIn',
      'notPermitted',
      'providerUnreachable',
    ];

    for (const status of refused) {
      expect(runWith(status), status).toBe(false);
    }
  });

  it('refuses without redirecting anywhere', () => {
    const result = runWith('redirecting');

    // Exactly `false`, not a `UrlTree`. Sending for the provider is
    // `ConsoleAuth`'s job and it does it once, at start, from the address the
    // browser was opened with - which is what carries a deep link through the
    // round trip (criterion 8). A guard that also redirected would race it, and
    // would race it again on every navigation.
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });

  it('fails when no auth is configured', () => {
    // It must not treat an unconfigured application as "nobody is signed in, so
    // refuse" either. Refusing quietly would look identical to working, on a
    // console where nothing could ever be reached; a wiring defect has to surface
    // as one.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [] });

    expect(() => TestBed.runInInjectionContext(() => authenticatedGuard(ROUTE, STATE))).toThrow();
  });
});

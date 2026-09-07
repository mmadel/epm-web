import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  AuthStatus,
  OrganizationMemberSession,
  providePlatformAdminSession,
  provideStubAuth,
  SESSION_SOURCE,
  SessionSource,
} from 'core';

import { platformAdminGuard } from './platform-admin-guard';

// The guard reads neither argument - it asks the session seam and nothing else -
// so there is nothing to build here beyond satisfying the signature.
const ROUTE = {} as ActivatedRouteSnapshot;
const STATE = {} as RouterStateSnapshot;

const MEMBER: OrganizationMemberSession = {
  actor: 'organizationMember',
  userId: 'u-2',
  displayName: 'Practice Manager',
  organizationId: 'org-1',
};

/** A session seam standing in for one that resolved somebody else. */
function provideSession(source: SessionSource) {
  return { provide: SESSION_SOURCE, useValue: source };
}

function run() {
  return TestBed.runInInjectionContext(() => platformAdminGuard(ROUTE, STATE));
}

describe('platformAdminGuard', () => {
  it('allows a signed-in platform administrator', () => {
    TestBed.configureTestingModule({
      providers: [provideStubAuth(), providePlatformAdminSession()],
    });

    expect(run()).toBe(true);
  });

  it('denies an organization member', () => {
    // Still unreachable in this console - it signs in against a realm that holds
    // only platform administrators - and still worth holding to. The guard asks
    // two questions and this is the second one; a change that made it ask only
    // the first would pass every other test in this file.
    TestBed.configureTestingModule({
      providers: [provideStubAuth(), provideSession({ session: signal(MEMBER).asReadonly() })],
    });

    expect(run()).toBe(false);
  });

  it('denies while nobody is signed in, whatever the session seam says', () => {
    // THE FIRST QUESTION, AND IT IS ASKED FIRST FOR A REASON. Five of the six auth
    // states are "not signed in", and in every one of them no route may activate -
    // even if a session left over from a previous sign-in is still readable.
    const refused: AuthStatus[] = [
      'starting',
      'redirecting',
      'signingIn',
      'notPermitted',
      'providerUnreachable',
    ];

    for (const status of refused) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideStubAuth({ status }), providePlatformAdminSession()],
      });

      expect(run(), status).toBe(false);
    }
  });

  it('denies when nobody is signed in yet, rather than treating that as a yes', () => {
    // `undefined` is the seam's word for "the provider has not answered". Reading
    // it as permission is the shape of every authorization bug worth having.
    TestBed.configureTestingModule({
      providers: [provideStubAuth(), provideSession({ session: signal(undefined).asReadonly() })],
    });

    expect(run()).toBe(false);
  });

  it('denies without redirecting anywhere', () => {
    TestBed.configureTestingModule({
      providers: [provideStubAuth(), provideSession({ session: signal(MEMBER).asReadonly() })],
    });

    const result = run();

    // Exactly `false`, not a UrlTree - and the reason has changed since this was
    // written, though the assertion has not. There IS a sign-in route now; going
    // to it is `ConsoleAuth`'s job, once, at start, from the address the browser
    // was opened with. A guard that redirected too would race it and lose the deep
    // link it is carrying (T-111 criterion 8).
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });

  it('fails when no session is configured', () => {
    // It must not treat an unconfigured application as "nobody is signed in, let
    // them through". No session is a wiring defect and has to surface as one.
    TestBed.configureTestingModule({ providers: [provideStubAuth()] });

    expect(() => run()).toThrow();
  });

  it('fails when no auth is configured', () => {
    // The same rule for the other seam. A console wired with a session and no way
    // to sign in would let every route through on a stale answer.
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    expect(() => run()).toThrow();
  });
});

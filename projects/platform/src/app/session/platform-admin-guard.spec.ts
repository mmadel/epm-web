import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  OrganizationMemberSession,
  providePlatformAdminSession,
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
  it('allows a platform administrator', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    expect(run()).toBe(true);
  });

  it('denies an organization member', () => {
    // Unreachable with the mock configured, and the reason the guard is written
    // now rather than when auth lands: the behaviour is settled and tested while
    // it is cheap, so the identity provider only has to fill in the seam.
    TestBed.configureTestingModule({
      providers: [provideSession({ session: signal(MEMBER).asReadonly() })],
    });

    expect(run()).toBe(false);
  });

  it('denies without redirecting anywhere', () => {
    TestBed.configureTestingModule({
      providers: [provideSession({ session: signal(MEMBER).asReadonly() })],
    });

    const result = run();

    // Exactly `false`, not a UrlTree. There is no sign-in route to send anyone
    // to, and this fails if somebody invents one before the auth decisions land.
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });

  it('fails when no session is configured', () => {
    // It must not treat an unconfigured application as "nobody is signed in, let
    // them through". No session is a wiring defect and has to surface as one.
    TestBed.configureTestingModule({ providers: [] });

    expect(() => run()).toThrow();
  });
});

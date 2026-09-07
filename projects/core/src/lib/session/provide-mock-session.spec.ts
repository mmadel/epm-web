import { TestBed } from '@angular/core/testing';

import { MOCK_PLATFORM_ADMIN, providePlatformAdminSession } from './provide-mock-session';
import { SESSION_SOURCE } from './session-source';
import { isPlatformAdmin, PlatformAdminSession } from './session';

describe('providePlatformAdminSession', () => {
  it('provides a SESSION_SOURCE', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    expect(TestBed.inject(SESSION_SOURCE).session()).toEqual(MOCK_PLATFORM_ADMIN);
  });

  it('signs in a platform administrator', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    const session = TestBed.inject(SESSION_SOURCE).session();

    // THE MOCK IS THE ONE IMPLEMENTATION THAT IS NEVER `undefined`, which is why
    // this narrows first and then asserts rather than simply passing the value in.
    // The seam's type allows nobody-signed-in because an identity provider
    // genuinely has nothing to say until it has answered (T-111); a mock has its
    // answer before anything can ask, and that difference is the assertion.
    expect(session).toBeDefined();
    expect(isPlatformAdmin(session!)).toBe(true);
  });

  it('signs in a context with no organization', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    // The same assertion the type carries, made against what actually reaches an
    // injector. A type can be right while the value handed out is a stale object
    // literal with an organization left on it.
    expect('organizationId' in TestBed.inject(SESSION_SOURCE).session()!).toBe(false);
  });

  it('accepts an overridden administrator', () => {
    const admin: PlatformAdminSession = {
      actor: 'platformAdmin',
      userId: 'u-9',
      displayName: 'Someone Else',
    };
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession(admin)] });

    expect(TestBed.inject(SESSION_SOURCE).session()).toEqual(admin);
  });

  it('exposes the session read-only', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    // A consumer holding the signal must not be able to reassign who is signed
    // in. `asReadonly` removes `set`; this asserts the provider actually applied
    // it rather than handing out the writable signal.
    expect('set' in TestBed.inject(SESSION_SOURCE).session).toBe(false);
  });

  it('gives each injector its own session', () => {
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });
    const first = TestBed.inject(SESSION_SOURCE);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [providePlatformAdminSession()] });

    expect(TestBed.inject(SESSION_SOURCE)).not.toBe(first);
  });
});

describe('SESSION_SOURCE', () => {
  it('fails injection when no session is configured', () => {
    // There is no default caller. An application that forgets to configure a
    // session must not boot with one the framework invented.
    TestBed.configureTestingModule({ providers: [] });

    expect(() => TestBed.inject(SESSION_SOURCE)).toThrow();
  });
});

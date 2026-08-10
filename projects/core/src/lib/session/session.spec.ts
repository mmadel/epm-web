import {
  isOrganizationMember,
  isPlatformAdmin,
  OrganizationMemberSession,
  PlatformAdminSession,
  Session,
} from './session';

const ADMIN: PlatformAdminSession = {
  actor: 'platformAdmin',
  userId: 'u-1',
  displayName: 'Platform Admin',
};

const MEMBER: OrganizationMemberSession = {
  actor: 'organizationMember',
  userId: 'u-2',
  displayName: 'Practice Manager',
  organizationId: 'org-1',
};

describe('Session', () => {
  describe('a platform context carries no organization', () => {
    // The requirement this whole type exists for. A platform administrator sits
    // outside every practice, so there is no practice to name - and the absence
    // has to be explicit rather than an empty string or a null treated as a
    // value.

    it('has no organization property at all', () => {
      // `in` rather than a truthiness or `=== undefined` check on purpose: those
      // two pass just as happily for `organizationId: null` or `''`, which are
      // exactly the shapes this is here to rule out. This asserts the property
      // is absent, not that it is falsy.
      expect('organizationId' in ADMIN).toBe(false);
    });

    it('does not enumerate an organization key', () => {
      // Belt to the braces above: catches an `organizationId: undefined` written
      // explicitly, which `in` would report as present but a reader would call
      // "no organization".
      expect(Object.keys(ADMIN)).not.toContain('organizationId');
    });

    it('cannot be read for an organization without narrowing', () => {
      const session: Session = ADMIN;

      // @ts-expect-error a Session is not known to have an organization until it
      // is narrowed to an organization member - that is the compile-time half of
      // this requirement, and this line fails the build if the union is ever
      // widened to make the read legal.
      void session.organizationId;
    });

    it('rejects an organization id on a platform administrator', () => {
      // @ts-expect-error PlatformAdminSession declares no organizationId, so
      // adding one is a type error rather than a field somebody later reads.
      const invalid: PlatformAdminSession = { ...ADMIN, organizationId: 'org-1' };

      void invalid;
    });
  });

  describe('isPlatformAdmin', () => {
    it('accepts a platform administrator', () => {
      expect(isPlatformAdmin(ADMIN)).toBe(true);
    });

    it('rejects an organization member', () => {
      expect(isPlatformAdmin(MEMBER)).toBe(false);
    });

    it('narrows to the platform administrator type', () => {
      const session: Session = ADMIN;

      expect(isPlatformAdmin(session) ? session.userId : 'not narrowed').toBe('u-1');
    });
  });

  describe('isOrganizationMember', () => {
    it('accepts an organization member', () => {
      expect(isOrganizationMember(MEMBER)).toBe(true);
    });

    it('rejects a platform administrator', () => {
      expect(isOrganizationMember(ADMIN)).toBe(false);
    });

    it('narrows so the organization id becomes readable', () => {
      const session: Session = MEMBER;

      expect(isOrganizationMember(session) ? session.organizationId : undefined).toBe('org-1');
    });
  });
});

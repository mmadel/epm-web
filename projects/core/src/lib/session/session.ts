/**
 * What kind of actor is signed in.
 *
 * The product has exactly two, and they are not variations of one another. An
 * organization member acts inside one practice and every request they make is
 * filtered to it. A platform administrator sits outside every practice, owns no
 * patient data, and their routes run with the tenant filter off.
 *
 * The set is closed - two values, no string escape hatch - for the same reason
 * `Language` is: a typo or a value from a future release must not become a third
 * kind of actor that no authorization check covers.
 */
export type ActorKind = 'platformAdmin' | 'organizationMember';

/** What every actor carries, whichever kind they are. */
export interface SessionBase {
  /** Stable identifier of the signed-in person. */
  readonly userId: string;

  /** Their name, for display only. Never used to make a decision. */
  readonly displayName: string;
}

/**
 * A platform administrator: one of the people who run the platform, not one of
 * the people who run a practice.
 *
 * **There is no organization in this type, and the absence is the point.** Not
 * `organizationId: null`, not `organizationId: ''`, not an `organizationId` that
 * is merely left unset - the property does not exist here at all, so reading
 * `session.organizationId` is a compile error until something narrows the union.
 *
 * A nullable field would look like the same record with a hole in it, and would
 * push the decision to every call site: each one would have to remember that
 * `null` means "deliberately none" rather than "not loaded yet" or "we forgot to
 * set it". Those three are indistinguishable once they are all spelled `null`,
 * and the one that gets shipped is a tenant hint of `null` sent to a server that
 * was never supposed to receive one.
 *
 * A distinct actor kind moves that from something a reviewer has to notice to
 * something the compiler refuses.
 */
export interface PlatformAdminSession extends SessionBase {
  readonly actor: 'platformAdmin';
}

/**
 * Somebody who works inside exactly one practice.
 *
 * The organization id is here because the client legitimately needs to know
 * which practice it is showing. It is **not** a tenant hint: the server derives
 * the practice from the caller, and the client never sends an organization id.
 */
export interface OrganizationMemberSession extends SessionBase {
  readonly actor: 'organizationMember';
  readonly organizationId: string;
}

/**
 * Who is signed in and what kind of actor they are.
 *
 * A discriminated union on {@link ActorKind} rather than one wide shape, so that
 * every field is reachable only from the kind of actor that actually has it.
 */
export type Session = PlatformAdminSession | OrganizationMemberSession;

/**
 * Narrows a session to a platform administrator.
 *
 * The only supported way to ask. Comparing `session.actor` by hand works too,
 * but a helper is what makes the guard read as a sentence and keeps the string
 * literal in one place.
 */
export function isPlatformAdmin(session: Session): session is PlatformAdminSession {
  return session.actor === 'platformAdmin';
}

/** Narrows a session to a member of one practice. */
export function isOrganizationMember(session: Session): session is OrganizationMemberSession {
  return session.actor === 'organizationMember';
}

/**
 * An error body as the API sends it: RFC 9457 `application/problem+json`.
 *
 * The server never sends a sentence for a user to read. It sends a stable `code` and
 * the facts behind it, and the client owns every word shown on screen - so a wording
 * change is a translation change here, not a server release, and the same failure
 * reads correctly in both languages.
 *
 * ```json
 * {
 *   "type": "https://errors.epm/EPM-ORG-006",
 *   "title": "Seat limit exceeded",
 *   "status": 422,
 *   "code": "EPM-ORG-006",
 *   "traceId": "0d3f...",
 *   "limit": 5,
 *   "requested": 7
 * }
 * ```
 *
 * Only the five members above the index signature are modelled. Everything else - the
 * `limit` and `requested` in the example - is per-code and is deliberately typed
 * loosely as `unknown`.
 *
 * That looseness is the design, not a shortcut. Modelling the extras as a discriminated
 * union on `code` would read well for a week and then break: the server adds a code, an
 * older client receives a body it cannot name, and the union either rejects it or
 * silently narrows it to the wrong arm. Codes are added server-side all the time and
 * clients are not redeployed in step with them. `unknown` forces the one place that
 * reads a field to check what it got, which is what a client that outlives its server's
 * version must do anyway.
 */
export interface ProblemDetails {
  /** URI identifying the problem type. Never shown; it is not a sentence. */
  readonly type?: string;

  /**
   * A short summary of the problem type, written for a developer reading a log.
   *
   * **This is never rendered.** Not as a heading, not as a tooltip, not as an
   * `aria-label`, not in a `title` attribute. It is English-only, it is written by
   * whoever added the code server-side, and it describes the fault rather than what
   * the person in front of the screen should do about it. It is logged, and the
   * on-screen wording comes from the translations instead.
   */
  readonly title?: string;

  /** The HTTP status code, repeated in the body by RFC 9457. */
  readonly status?: number;

  /**
   * The stable identifier for this failure, e.g. `EPM-ORG-006`.
   *
   * This is the only member the client dispatches on. Codes never change meaning and
   * are never reused, which is what makes a lookup table of wording safe.
   */
  readonly code: string;

  /**
   * Correlates this response with the server-side request log.
   *
   * **Logged, never displayed.** It means nothing to a user, and putting it on screen
   * invites people to read it back over the phone instead of us reading the log.
   */
  readonly traceId?: string;

  /**
   * The facts behind the failure, which vary per code.
   *
   * `EPM-ORG-006` carries `limit` and `requested`; a code added next quarter will carry
   * something else. These are the inputs to the message: a translation names them as
   * `{limit}` / `{requested}` placeholders.
   */
  readonly [field: string]: unknown;
}

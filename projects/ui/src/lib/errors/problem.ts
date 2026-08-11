import type { Problem } from 'api-client';

/**
 * An error body as the API sends it: RFC 9457 `application/problem+json`.
 *
 * **This is the generated type, under a local name — not a copy of it.** It was a
 * hand-written interface until ticket T-85 generated a client from the API's own
 * specification, and a second description of a server shape is exactly what that
 * ticket exists to remove. A copy keeps compiling after the backend renames a
 * member, so the build stays green and the mismatch is found by a user; an alias
 * cannot, because it has no members of its own to go stale. The name is kept
 * because it is what this library's component, fixtures and tests already call
 * it, and renaming them proves nothing.
 *
 * The server never sends a sentence for a user to read. It sends a stable `code`
 * and the facts behind it, and the client owns every word shown on screen - so a
 * wording change is a translation change here, not a server release, and the same
 * failure reads correctly in both languages.
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
 * Five members are declared; everything else - the `limit` and `requested` in the
 * example - is per-code, and reaches the type through the index signature the
 * specification's `additionalProperties` produces.
 *
 * That looseness is the design, not a shortcut. Modelling the extras as a
 * discriminated union on `code` would read well for a week and then break: the
 * server adds a code, an older client receives a body it cannot name, and the
 * union either rejects it or silently narrows it to the wrong arm. Codes are
 * added server-side all the time and clients are not redeployed in step with
 * them. The one place that reads such a field checks what it got - see
 * `messageFields` in `error-message.ts`, which keeps a value only once it has
 * proved to be a string or a number.
 *
 * Two members are never rendered, whatever the type says is available:
 *
 * - `title` is a developer's summary of the fault, server-authored and
 *   English-only. It is logged, never shown, and never handed to the translator.
 * - `traceId` identifies the server-side log entry. It is logged, never shown.
 *
 * Both rules live in `ErrorMessage`, which is the only thing that reads a body.
 */
export type ProblemDetails = Problem;

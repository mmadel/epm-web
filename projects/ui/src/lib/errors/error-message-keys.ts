import { TranslationKey } from '../i18n/translations';

/**
 * Every error code the API can send, and the translation key that words it.
 *
 * **Adding a server code is one row here and two translation strings** - one in
 * `errors.en.ts`, one in `errors.ar.ts` - and nothing else. No component, no `switch`,
 * no subclass, no registration call, no change to any application. That is the whole
 * point of this table existing, and it is worth protecting: the moment wording lives
 * anywhere but the translations, or dispatch lives anywhere but here, a new code
 * becomes a code change in several files and people start reaching for the server's
 * `title` instead.
 *
 * Two things make that guarantee real rather than aspirational:
 *
 * - `satisfies Readonly<Record<string, TranslationKey>>` means a row pointing at a key
 *   that no translation file defines is a compile error, not a key rendered on screen.
 * - `as const` makes {@link ErrorCode} the list of codes, so a fixture set or a test
 *   that must cover every code cannot silently miss the newest one.
 *
 * Codes are stable forever: a code is never reused and never changes meaning. That is
 * what makes a lookup table safe here, where a lookup table would normally be a
 * liability.
 */
export const ERROR_MESSAGE_KEYS = {
  'EPM-REQ-001': 'errors.request.malformed',
  'EPM-REQ-002': 'errors.request.unknown-role',
  'EPM-REQ-003': 'errors.request.missing-idempotency-key',

  'EPM-ORG-001': 'errors.organization.clinic-position-out-of-range',
  'EPM-ORG-002': 'errors.organization.duplicate-branch-name',
  'EPM-ORG-003': 'errors.organization.duplicate-email',
  'EPM-ORG-004': 'errors.organization.unknown-plan',
  'EPM-ORG-005': 'errors.organization.unknown-speciality',
  'EPM-ORG-006': 'errors.organization.seat-limit-reached',
  'EPM-ORG-007': 'errors.organization.status-not-settable',
  'EPM-ORG-008': 'errors.organization.branch-limit-reached',
  'EPM-ORG-009': 'errors.organization.last-active-branch',
  'EPM-ORG-010': 'errors.organization.last-admin',
  'EPM-ORG-011': 'errors.organization.staff-needs-branch',
} as const satisfies Readonly<Record<string, TranslationKey>>;

/** Every code this client has wording for. */
export type ErrorCode = keyof typeof ERROR_MESSAGE_KEYS;

/**
 * The registry read as a lookup rather than as a literal.
 *
 * The type matters: a code arrives from the network, so it is a `string` and it may
 * name nothing in the table above. Reading it through this view makes the miss a
 * `undefined` the compiler insists is handled, instead of a value that is claimed to
 * be a `TranslationKey` and is not one - which would reach the translator and render
 * as the missing key itself.
 */
const KEY_BY_CODE: Readonly<Partial<Record<string, TranslationKey>>> = ERROR_MESSAGE_KEYS;

/** The translation key for `code`, or `undefined` if this client has no wording for it. */
export function lookUpErrorMessageKey(code: string): TranslationKey | undefined {
  return KEY_BY_CODE[code];
}

/**
 * The wording shown for a code this build has never heard of.
 *
 * Codes are added server-side and clients are not rebuilt in step with them, so a
 * client meeting an unfamiliar code is ordinary traffic rather than a fault. This is
 * what it shows, and it is why {@link errorMessageKey} resolves to a key that exists
 * instead of handing the translator something that does not.
 */
export const UNKNOWN_ERROR_MESSAGE_KEY: TranslationKey = 'errors.unknown.message';

/**
 * The translation key to render for `code` - always one that exists.
 *
 * The fallback happens **here, before translation**, and the ordering is the point.
 * `TranslationService` renders an unknown key as the key itself, deliberately: a
 * missing string should be a visible bug rather than a blank label. That is right for
 * a key a developer typed and wrong for a code that arrived over the network, where
 * the same rule would put `errors.unknown.EPM-XXX-999` in front of a user the first
 * time the server shipped a code ahead of the client. Resolving the miss to a key that
 * exists means translation is never asked a question it has to answer badly.
 */
export function errorMessageKey(code: string): TranslationKey {
  return lookUpErrorMessageKey(code) ?? UNKNOWN_ERROR_MESSAGE_KEY;
}

import { ErrorCode } from './error-message-keys';
import { ProblemDetails } from './problem';

/**
 * One problem+json body per error code the API can send, exactly as it arrives.
 *
 * These are written out as literal data rather than built by a helper, because that is
 * what they are for: a reviewer should be able to read a fixture and a real response
 * side by side and see the same thing. Nothing here is fetched - this ticket makes no
 * network call anywhere - so this file is the only description of the server's output
 * the client has, and it is worth it being literal.
 *
 * The type is `Record<ErrorCode, ...>`, so a code added to the registry without a
 * fixture is a compile error. Between that and `ErrorCode` coming from the registry
 * itself, "every code is covered" is checked rather than remembered.
 *
 * `title` is a developer's summary, English-only and server-authored. It is here
 * because it is in the real payload and because the tests need a title per fixture to
 * prove that none of them reaches the DOM - not because anything should render it.
 */
export const PROBLEM_FIXTURES: Readonly<Record<ErrorCode, ProblemDetails>> = {
  'EPM-REQ-001': {
    type: 'https://errors.epm/EPM-REQ-001',
    title: 'Malformed request',
    status: 400,
    code: 'EPM-REQ-001',
    traceId: '3f1c7a90-1b44-4a2e-8f0d-91c6b2d7e401',
  },
  'EPM-REQ-002': {
    type: 'https://errors.epm/EPM-REQ-002',
    title: 'Unknown role value',
    status: 400,
    code: 'EPM-REQ-002',
    traceId: 'b7d2e5c1-8a36-4d90-b2f7-0c4a1e93d552',
  },
  'EPM-REQ-003': {
    type: 'https://errors.epm/EPM-REQ-003',
    title: 'Idempotency-Key header missing',
    status: 400,
    code: 'EPM-REQ-003',
    traceId: '5a0e94b3-2c17-4f68-9e31-7d8b6c0a2f13',
  },

  'EPM-ORG-001': {
    type: 'https://errors.epm/EPM-ORG-001',
    title: 'Clinic position out of range',
    status: 400,
    code: 'EPM-ORG-001',
    traceId: 'c48f1d02-6b95-4e73-a1c8-3f5d20e79b64',
  },
  'EPM-ORG-002': {
    type: 'https://errors.epm/EPM-ORG-002',
    title: 'Duplicate branch name',
    status: 409,
    code: 'EPM-ORG-002',
    traceId: '9e73a5f4-0d28-4c16-8b52-6a1f7c40d385',
  },
  'EPM-ORG-003': {
    type: 'https://errors.epm/EPM-ORG-003',
    title: 'Duplicate email',
    status: 409,
    code: 'EPM-ORG-003',
    traceId: '2b6c8014-7f3a-49d5-90e6-4c8b1a52f736',
  },
  'EPM-ORG-004': {
    type: 'https://errors.epm/EPM-ORG-004',
    title: 'Unknown plan',
    status: 422,
    code: 'EPM-ORG-004',
    traceId: '7d40b9e2-5c81-4a37-b6f9-08e3d1c74927',
  },
  'EPM-ORG-005': {
    type: 'https://errors.epm/EPM-ORG-005',
    title: 'Unknown speciality code',
    status: 422,
    code: 'EPM-ORG-005',
    traceId: 'e15a3c76-9b04-4d82-8f13-27c6b95a0e48',
  },
  // The two numbers are the whole message: the wording names both, so a reader can see
  // how far over the limit they are without going and counting staff.
  'EPM-ORG-006': {
    type: 'https://errors.epm/EPM-ORG-006',
    title: 'More staff than seats allow',
    status: 422,
    code: 'EPM-ORG-006',
    traceId: '4c92f018-3d67-4b95-a2e8-15b7d06c3f89',
    limit: 5,
    requested: 7,
  },
  'EPM-ORG-007': {
    type: 'https://errors.epm/EPM-ORG-007',
    title: 'Organization status is not settable by a client',
    status: 422,
    code: 'EPM-ORG-007',
    traceId: 'a6318be5-4f70-42c9-b8d1-93e50a2c7461',
  },
  'EPM-ORG-008': {
    type: 'https://errors.epm/EPM-ORG-008',
    title: 'Branch limit exceeded',
    status: 422,
    code: 'EPM-ORG-008',
    traceId: 'd0745e91-8c23-4a6f-95b0-1e2f83a6c507',
    limit: 3,
  },
  'EPM-ORG-009': {
    type: 'https://errors.epm/EPM-ORG-009',
    title: 'Cannot deactivate the only active branch',
    status: 422,
    code: 'EPM-ORG-009',
    traceId: '68b2c4f7-1a05-4e39-8d76-c920f31b5a48',
  },
  'EPM-ORG-010': {
    type: 'https://errors.epm/EPM-ORG-010',
    title: 'Cannot remove the last active org admin',
    status: 422,
    code: 'EPM-ORG-010',
    traceId: 'f3096d81-7b52-4c04-a9e3-5d18b702c694',
  },
  'EPM-ORG-011': {
    type: 'https://errors.epm/EPM-ORG-011',
    title: 'A staff member needs at least one branch',
    status: 422,
    code: 'EPM-ORG-011',
    traceId: '1c85f2a0-943d-4b76-8e21-70a6c3d95f82',
  },
};

/**
 * A body whose code is in no registry row - what an older client sees the day the
 * server ships a new code.
 *
 * It is shaped like every fixture above in each other respect, because the point of it
 * is that nothing else about it is unusual: a client that has fallen behind its server
 * is the normal state of affairs, not a broken one.
 */
export const UNMAPPED_CODE_PROBLEM: ProblemDetails = {
  type: 'https://errors.epm/EPM-BIL-042',
  title: 'Invoice already settled',
  status: 409,
  code: 'EPM-BIL-042',
  traceId: '8c1f4b2e-7a03-4f19-9d55-2b6c0e1a7d84',
};

import { ErrorsKey } from './errors.en';

/**
 * PLACEHOLDER - THESE VALUES ARE ENGLISH, NOT ARABIC.
 *
 * Nothing in this file has been translated. Clinical Arabic needs a clinician's
 * sign-off and that clinician has not been identified yet, so the gap is left
 * visible rather than filled with machine translation that would read as finished
 * work. See ./README.md before changing anything here.
 *
 * Error wording is the worst possible place to guess: these strings tell someone what
 * went wrong and what to do about it, and plausible-but-wrong Arabic here sends people
 * to the wrong remedy rather than merely looking odd.
 *
 * The type annotation is the point of this file being TypeScript: it fails the
 * build if a key here is missing or misspelt relative to `errors.en.ts`.
 */
export const errorsAr: Record<ErrorsKey, string> = {
  'errors.unknown.message':
    'Something went wrong and that did not go through. Try again, and contact support if it keeps happening.',

  'errors.request.malformed':
    'Something in that request was not valid, so nothing was saved. Refresh the page and try again.',
  'errors.request.unknown-role':
    'That is not a role this system recognises. Pick one from the list and try again.',
  'errors.request.missing-idempotency-key':
    'That request could not be sent safely, so nothing was saved. Refresh the page and try again.',

  'errors.organization.clinic-position-out-of-range':
    'That position is outside the range this clinic allows. Pick a position from the list and try again.',
  'errors.organization.duplicate-branch-name':
    'A branch with this name already exists. Give this one a different name.',
  'errors.organization.duplicate-email':
    'This email address is already in use. Enter a different one.',
  'errors.organization.unknown-plan':
    'That is not a plan we offer. Pick one from the list and try again.',
  'errors.organization.unknown-speciality':
    'That is not a speciality we recognise. Pick one from the list and try again.',

  'errors.organization.seat-limit-reached':
    'Your plan covers {limit} staff members and this change would need {requested}. Add seats to your plan, or move to a plan that includes more.',
  'errors.organization.status-not-settable':
    'The status of an organization is not something you can set here. Contact support if it needs to change.',
  'errors.organization.branch-limit-reached':
    'Your plan covers {limit} branches, and they are all in use. Add capacity to your plan, or move to a plan that includes more.',
  'errors.organization.last-active-branch':
    'This is the only branch still active, so it cannot be switched off. Activate another branch first.',
  'errors.organization.last-admin':
    'This is the last person with administrator access, so it cannot be taken away. Give someone else administrator access first.',
  'errors.organization.staff-needs-branch':
    'Every staff member belongs to at least one branch. Pick a branch before saving.',
};

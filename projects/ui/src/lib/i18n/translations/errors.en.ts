/**
 * English strings for the `errors` area: what a person is told when a request fails.
 *
 * The API never sends a sentence for a user to read - it sends a stable code and the
 * facts behind it - so every word a user sees about a failure is written here. That is
 * why this file is prose rather than labels: each string says what happened and what
 * to do next, and a `{name}` placeholder is filled from the fields the server sent
 * alongside the code (see ../../errors/error-message-keys.ts).
 *
 * See ./README.md for the folder and key conventions this file follows.
 */
export const errorsEn = {
  // Shown for a code this build has no wording for - almost always a code the server
  // started sending after this client was built. It has to stand on its own with no
  // facts at all, so it says the two true things: nothing was saved, and here is what
  // to do next. It never mentions the code; that goes to the console.
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

  // Both numbers are named on purpose. "You have reached your seat limit" leaves the
  // reader counting staff to work out how far over they are; naming the limit and the
  // number they asked for turns it into one decision, and the two options after it are
  // the only two that exist - there is nothing to retry here.
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

  // ONE SENTENCE FOR BOTH WAYS OF BREAKING THE RULE - nobody has it, or more than one
  // does. Naming the rule and then the remedy covers both without the message having to
  // know which of them happened, which it cannot: the code says the set is wrong, not
  // how. It is about the staff as a whole rather than about any one person, and the
  // wording never says "this person" for that reason.
  'errors.organization.needs-one-org-admin':
    'A practice needs exactly one person with administrator access. Give it to one of them and take it off the rest.',
};

/** Every key this area defines. `errors.ar.ts` must define exactly these. */
export type ErrorsKey = keyof typeof errorsEn;

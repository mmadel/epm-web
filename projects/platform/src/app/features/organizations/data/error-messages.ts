import { Problem } from 'api-client';

/**
 * What a reader is told when the server refuses, in this console's own words.
 *
 * THE SERVER SENDS NO SENTENCE. It sends a stable code and the facts behind it
 * (§4), and every word on this screen is written here - which is why `title` and
 * `traceId` are logged below and rendered nowhere (criterion 16). `title` is a
 * developer's summary written server-side; putting it on screen would show a
 * reader a log line and would make a server release the way to fix a typo.
 *
 * WHY THIS EXISTS WHEN `ui` HAS `ErrorMessage`. The shared component words exactly
 * these codes already, and reusing it was the plan - but it words them through the
 * translations, which run on `LanguageService`, and the platform console is barred
 * from touching that mechanism: it is English-only and LTR-only (P-03.2), and
 * `console-layout.spec.ts` fails the build if anything in the console constructs
 * the service, because constructing it labels the document with `lang` and `dir`.
 * So the console owns its wording, as it owns every other string it shows. The
 * shared registry stays the right home for a console that speaks two languages;
 * this one does not. It is a real duplication of the sentences and it is the
 * smaller cost - reported in the PR.
 */
export function messageForProblem(problem: Problem): string {
  // One line per failure for whoever has to explain it later, and the only place
  // `title` and `traceId` are read. Seeing this in a log is also how anyone finds
  // out the server has started sending a code this build has no wording for.
  console.error(`[onboarding] ${problem.code}`, {
    status: problem.status,
    title: problem.title,
    traceId: problem.traceId,
  });

  const written = WORDING[problem.code];

  if (written === undefined) {
    console.warn(
      `[onboarding] No wording for code "${problem.code}"; showed the generic message. ` +
        'Add a row to WORDING in data/error-messages.ts.',
    );

    return UNKNOWN;
  }

  return written(problem);
}

/**
 * The wording for a code this build has never heard of.
 *
 * A client meeting an unfamiliar code is ordinary traffic rather than a fault:
 * codes are added server-side and consoles are not redeployed in step with them.
 * It says the two things that are true whatever the code was - nothing was saved,
 * and here is what to do - and it never shows the code or the body. A raw `code` on
 * screen is a support call; raw JSON is criterion 15's explicit "never".
 */
const UNKNOWN =
  'Something went wrong and that did not go through. Nothing was created. Try again, and ' +
  'contact support if it keeps happening.';

/** A whole number from the body, or a placeholder when the server sent none. */
function count(problem: Problem, member: string): string {
  const value = problem[member];

  return typeof value === 'number' ? String(value) : 'more';
}

/**
 * Every code §4 lists, and the sentence shown for it.
 *
 * Each says what happened and what to do next, because a message that only says
 * what happened leaves the reader with the same problem and less patience. They are
 * written for a platform administrator filling in this form - not for the person
 * who wrote the endpoint.
 */
const WORDING: Readonly<Record<string, (problem: Problem) => string>> = {
  'EPM-REQ-001': () =>
    'Something in that request was not valid, so nothing was created. Check the marked field ' +
    'and try again.',

  'EPM-REQ-002': () =>
    'That is not a role this system recognises. Choose from the roles listed and try again.',

  // The reader did nothing wrong and can do nothing about it, so it says neither.
  'EPM-REQ-003': () =>
    'That request could not be sent safely, so nothing was created. Reload the page and try ' +
    'again — and tell whoever maintains this console, because this one is a defect here.',

  'EPM-ORG-001': () =>
    'This person is assigned to a branch that is not in the list. Tick the branches they work ' +
    'at and try again.',

  'EPM-ORG-002': () => 'Two branches cannot share a name. Rename one of them.',

  'EPM-ORG-003': () => 'Two people cannot share an email address. Change one of them.',

  'EPM-ORG-004': () => 'That is not a plan on offer. Choose one from the list and try again.',

  'EPM-ORG-005': () =>
    'That is not a speciality this system recognises. Clear it or enter a code from the ' +
    'reference list.',

  // BOTH NUMBERS, AND BOTH WAYS OUT (criterion 13). "You have reached your seat
  // limit" leaves the reader counting staff to work out how far over they are;
  // naming the limit and what was asked for makes it one decision, and the two
  // options after it are the only two there are - retrying changes nothing.
  'EPM-ORG-006': (problem) =>
    `This plan covers ${count(problem, 'limit')} staff members and this practice needs ` +
    `${count(problem, 'requested')}. Remove someone, or move the practice to a plan with more ` +
    'seats.',

  // ONE SENTENCE FOR BOTH WAYS OF BREAKING THE RULE - nobody has the role, or more
  // than one person does. The code says the set is wrong and not how, so a message
  // that guessed ("you have too many") would be wrong half the time; naming the rule
  // and then the remedy is right either way.
  //
  // It names the role by the label the checkbox carries rather than by `ORG_ADMIN`,
  // for the reason `roles.ts` gives: the reader ticked a job, not a constant.
  'EPM-ORG-014': () =>
    'A practice needs exactly one person with the Org admin role. Tick it for one of them ' +
    'and untick it for anyone else.',
};

import { Problem } from 'api-client';

/**
 * What a reader is told when a save is refused, in this console's own words.
 *
 * WHY THIS IS NOT `error-messages.ts`. That file words the codes the ONBOARDING
 * call answers with, and the codes are not global: `EPM-REQ-002` there is a role the
 * system does not recognise, because that request carries roles. Here it is a member
 * the PATCH does not accept, and this request carries no roles at all. One code, two
 * routes, two sentences - so pointing this screen at that map would show a platform
 * administrator a sentence about staff roles after failing to rename a practice.
 *
 * The server sends no sentence in either case (§4). It sends a stable code and the
 * facts behind it, and every word shown is written on this side - which is why
 * `title` and `traceId` are logged below and rendered nowhere. `title` is a
 * developer's summary written server-side; on screen it shows a reader a log line.
 */
export function messageForUpdateProblem(problem: Problem): string {
  // One line per refusal for whoever has to explain it later, and the only place
  // `title` and `traceId` are read.
  console.error(`[practice-edit] ${problem.code}`, {
    status: problem.status,
    title: problem.title,
    traceId: problem.traceId,
  });

  const written = WORDING[problem.code];

  if (written === undefined) {
    console.warn(
      `[practice-edit] No wording for code "${problem.code}"; showed the generic message. ` +
        'Add a row to WORDING in data/update-messages.ts.',
    );

    return UNKNOWN;
  }

  return written;
}

/**
 * The wording for a code this build has never heard of.
 *
 * A client meeting an unfamiliar code is ordinary traffic rather than a fault: codes
 * are added server-side and consoles are not redeployed in step with them. It says
 * the two things that are true whatever the code was - the name did not change, and
 * here is what to do - and it never shows the code or the body.
 */
const UNKNOWN =
  'Something went wrong and that did not go through. The practice was not changed. Try again, ' +
  'and contact support if it keeps happening.';

/**
 * A defect on this side, said plainly.
 *
 * Two of the four codes below can only happen if this console sent something it does
 * not send: the request is built one member at a time in `PracticeUpdate`, and it
 * carries the name alone. The reader is owed a sentence anyway - the button they
 * pressed did nothing, and silence is not an option - but the sentence tells them
 * the truth, which is that this one is not theirs to fix.
 */
const OURS =
  'That could not be saved because this console asked for something the server does not allow. ' +
  'The practice was not changed. Reload the page and try again — and tell whoever maintains ' +
  'this console, because this one is a defect here.';

/** Every code the PATCH can answer with, and the sentence shown for it. */
const WORDING: Readonly<Record<string, string>> = {
  // The name itself was refused - blank, or longer than the column takes. The one
  // code here a reader can act on, so it is the one that names the control.
  'EPM-REQ-001':
    'That name was not accepted, so the practice was not changed. Check the name and try again.',

  // A member the route does not accept. This console sends only `name`.
  'EPM-REQ-002': OURS,

  // Sending `status` at all, whatever its value. Status moves through the suspend,
  // reopen and close routes; this screen does not call them.
  'EPM-ORG-007': OURS,
};

/**
 * A practice that is no longer there, which is a 404 rather than a code.
 *
 * There may well be a code for it too, but this build does not know which - the
 * specification describes the responses, not the codes inside them, and inventing a
 * row above for a code nobody has seen would put a confident sentence behind a
 * guess. The status is enough to say the true thing, and `Practice` reads a 404 the
 * same way for the same reason.
 */
export const MISSING =
  'This practice could not be found, so nothing was changed. It may have been removed since ' +
  'this page was opened. Go back to the list and look for it there.';

/**
 * A save that never got an answer, which is not the same as one that was refused.
 *
 * NOTHING IS KNOWN HERE, and the sentence says so rather than guessing. What it can
 * say, and what the equivalent message on the onboarding screen cannot, is that
 * trying again is safe: this is a PATCH that sets a name to a value, so a second
 * attempt leaves the practice as the second attempt asked. There is no idempotency
 * key on this call for the same reason - see `PracticeUpdate`.
 */
export const UNREACHABLE =
  'That did not reach the server, so it is not known whether the name changed. Try again — ' +
  'sending it twice is safe, and the practice below will show what was saved.';

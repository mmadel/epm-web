import { Problem } from 'api-client';

import { messageForProblem } from './error-messages';
import { Fault } from '../faults';
import { OrganizationDraft } from '../organization-draft';

/**
 * The server's refusal, put where the reader can act on it.
 *
 * §4 gives a table of codes and, for each, the control that should take focus and
 * the message. THIS FILE IS THE FIRST HALF OF THAT TABLE - where each code goes -
 * and `error-messages.ts` is the second - what each one says. They are apart
 * because they change for different reasons: a wording fix is a sentence, and a new
 * code is a row in both.
 *
 * WHICH ROW THE SERVER MEANT IS A GUESS, and it is a guess made carefully. The
 * problem body carries per-code facts beyond the five standard members, but the
 * names of those members are not in the specification this client is generated
 * from - `Problem` has an index signature and nothing more. So each lookup below
 * reads the members it would be reasonable for the server to send, checks the type
 * of what it finds, and FALLS BACK TO THE REGION when it finds nothing. The
 * consequence of a miss is a message at the top of the right step instead of beside
 * the right control; the consequence of guessing wrongly would be a message beside
 * the wrong person, which is worse. The exact member names are the thing to confirm
 * against `epm-service` and correct here - see the PR.
 */
export function faultFrom(problem: Problem, draft: OrganizationDraft): Fault {
  switch (problem.code) {
    case 'EPM-REQ-001':
      return { ...fieldNamedBy(problem), message: messageForProblem(problem) };

    case 'EPM-REQ-002':
      return {
        region: 'staff',
        rowKey: staffRowNamedBy(problem, draft),
        field: 'roles',
        message: messageForProblem(problem),
      };

    case 'EPM-REQ-003':
      // A client defect: the header is required on every call and this client sends
      // it on every call, so arriving here means the request was built wrongly. It
      // is said out loud for whoever has to explain it, and the reader still gets a
      // message - the button they pressed did nothing, and silence is not an option.
      console.error(
        '[onboarding] The server answered EPM-REQ-003: the Idempotency-Key header was missing. ' +
          'That header is this client to send, so this is a defect here, not a mistake by the reader.',
      );

      return { region: 'form', message: messageForProblem(problem) };

    case 'EPM-ORG-001':
      return {
        region: 'staff',
        rowKey: staffRowNamedBy(problem, draft),
        field: 'branches',
        message: messageForProblem(problem),
      };

    case 'EPM-ORG-002':
      return {
        region: 'branches',
        rowKey: secondBranchNamed(problem, draft),
        field: 'name',
        message: messageForProblem(problem),
      };

    case 'EPM-ORG-003':
      return {
        region: 'staff',
        rowKey: secondStaffWithEmail(problem, draft),
        field: 'email',
        message: messageForProblem(problem),
      };

    case 'EPM-ORG-004':
      return { region: 'practice', field: 'plan', message: messageForProblem(problem) };

    case 'EPM-ORG-005':
      return {
        region: 'staff',
        rowKey: staffRowNamedBy(problem, draft),
        field: 'speciality',
        message: messageForProblem(problem),
      };

    case 'EPM-ORG-006':
      // The staff region's header, not a row: nobody in particular is the person
      // over the limit, and marking the last one added would say they were.
      return { region: 'staff', message: messageForProblem(problem) };

    case 'EPM-ORG-014':
      // THE STAFF REGION, NEVER A ROW - and unlike every per-person code above,
      // there is no row to look for. The body names `staff`, the array, because
      // that is what is wrong: the wrong number of people hold the role. Whether
      // none of them does or two of them do, no single person is the mistake, and
      // marking one would tell the reader to fix that person.
      return { region: 'staff', message: messageForProblem(problem) };

    default:
      // A code this build has never heard of - ordinary traffic, since codes are
      // added server-side and clients are not rebuilt in step with them. It gets
      // the generic wording, beside the button that was pressed, and the code is
      // logged (criterion 15). Never a blank screen, never the raw body.
      return { region: 'form', message: messageForProblem(problem) };
  }
}

/** A member of the body, if it is there and is a string. */
function text(problem: Problem, member: string): string | undefined {
  const value = problem[member];

  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** A member of the body, if it is there and is a whole number. */
function position(problem: Problem, member: string): number | undefined {
  const value = problem[member];

  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

/**
 * `EPM-REQ-001` names the field it could not read. This finds the control for it.
 *
 * Only the four top-level fields are recognised, because they are the four the
 * request has. Anything deeper - or anything unrecognised - goes to the region it
 * belongs to rather than to a control, which is as precise as this can honestly be.
 */
function fieldNamedBy(problem: Problem): Pick<Fault, 'region' | 'field'> {
  const named = (text(problem, 'field') ?? text(problem, 'property') ?? '').toLowerCase();

  if (named.startsWith('name')) {
    return { region: 'practice', field: 'name' };
  }

  if (named.startsWith('plan')) {
    return { region: 'practice', field: 'plan' };
  }

  if (named.startsWith('clinics')) {
    return { region: 'branches' };
  }

  if (named.startsWith('staff')) {
    return { region: 'staff' };
  }

  return { region: 'form' };
}

/** The staff row a per-person code is about: by email if named, else by position. */
function staffRowNamedBy(problem: Problem, draft: OrganizationDraft): string | undefined {
  const email = text(problem, 'email');

  if (email !== undefined) {
    const named = draft.staff().find((member) => member.email.trim() === email);

    if (named !== undefined) {
      return named.key;
    }
  }

  const at = position(problem, 'index') ?? position(problem, 'staffIndex');

  return at === undefined ? undefined : draft.staff()[at]?.key;
}

/**
 * The SECOND branch row carrying the name the server rejected (§4, `EPM-ORG-002`).
 *
 * The second rather than the first because the first one is the branch that will
 * exist; the second is the one that has to change.
 *
 * MATCHED WITHOUT REGARD TO CASE, which is not what the client's own duplicate rule
 * does - and the difference is deliberate. That rule decides whether to REFUSE to
 * send, so it is exact: refusing "Maadi" and "maadi" as a pair would be this console
 * inventing a rule the server may not have. This is only deciding WHERE to put a
 * message about a refusal that has already happened, so it should find the row a
 * reader would say the server meant.
 *
 * When only one row matches, that row is the answer: the server named one name and
 * one row carries it. When none does - or the server named nothing at all - the
 * message goes to the step, which is as precise as this can honestly be.
 */
function secondBranchNamed(problem: Problem, draft: OrganizationDraft): string | undefined {
  const name = text(problem, 'name') ?? text(problem, 'clinicName');

  if (name === undefined) {
    return undefined;
  }

  const carrying = draft.branches().filter((branch) => matches(branch.name, name));

  return (carrying.at(1) ?? carrying.at(0))?.key;
}

/** The same, for the second staff row with a rejected email (`EPM-ORG-003`). */
function secondStaffWithEmail(problem: Problem, draft: OrganizationDraft): string | undefined {
  const email = text(problem, 'email');

  if (email === undefined) {
    return undefined;
  }

  const carrying = draft.staff().filter((member) => matches(member.email, email));

  return (carrying.at(1) ?? carrying.at(0))?.key;
}

/** Trimmed, and without regard to case. See the note on `secondBranchNamed`. */
function matches(row: string, named: string): boolean {
  return row.trim().toLowerCase() === named.trim().toLowerCase();
}

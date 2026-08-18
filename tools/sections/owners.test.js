// Every section placeholder names the ticket that will replace it.
//
// T-97 §9: the four section components exist with placeholder bodies, and each names
// its owner. The ticket id is in the component's documentation rather than on the
// screen, because "T-65" is a sentence to whoever builds this console and noise to
// the practice manager reading it - and the reason to write it down is so that the
// next person opening `clinics-section.ts` knows whose work replaces it, which is a
// question asked in an editor and not in a browser.
//
// It is a test rather than a convention because a placeholder with no owner is
// exactly the file that survives three milestones.

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const SECTIONS = join(__dirname, '..', '..', 'projects', 'staff', 'src', 'app', 'sections');

/** Every section, and the ticket that fills it. T-97 §4's route table. */
const OWNERS = {
  'practice-section.ts': 'T-65',
  'clinics-section.ts': 'T-66',
  'staff-section.ts': 'T-67',
  'subscription-section.ts': 'T-69',
};

test('every section names the ticket that fills it', () => {
  for (const [file, ticket] of Object.entries(OWNERS)) {
    const source = readFileSync(join(SECTIONS, file), 'utf8');

    assert.match(source, new RegExp(`${ticket} FILLS IT`), `${file} does not name ${ticket}`);
  }
});

test('no two sections claim the same owner', () => {
  // Four screens with one owner between them is the shape this ticket exists to
  // avoid: two authors on one component is a merge conflict with opinions.
  const tickets = Object.values(OWNERS);

  assert.equal(new Set(tickets).size, tickets.length);
});

test('every section renders a placeholder rather than an empty screen', () => {
  // A blank content region looks exactly like a screen that failed to load, which is
  // the report this saves somebody from filing.
  for (const file of Object.keys(OWNERS)) {
    const template = readFileSync(join(SECTIONS, file.replace('.ts', '.html')), 'utf8');

    assert.match(template, /<lib-placeholder/, `${file} renders no placeholder`);
  }
});

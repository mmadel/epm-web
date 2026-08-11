'use strict';

const test = require('node:test');
const { resolve } = require('node:path');
const { RuleTester } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('./no-server-type-mirrors');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// A stand-in for the generated client, so these cases do not depend on one
// having been generated in this checkout. The last test uses the real thing.
const TYPES = [
  {
    name: 'OnboardOrganizationRequest',
    properties: ['clinics', 'name', 'plan', 'staff'],
  },
  { name: 'CreatedClinic', properties: ['id', 'name'] },
  { name: 'Problem', properties: ['code', 'status', 'title', 'traceId', 'type'] },
];

const options = [{ types: TYPES }];

test('no-server-type-mirrors', () => {
  ruleTester.run('no-server-type-mirrors', rule, {
    valid: [
      // The point of the rule: use the generated type.
      {
        code: "import { OnboardOrganizationRequest } from 'api-client';",
        options,
      },
      // A shape that is genuinely this workspace's own, not the server's.
      {
        code: 'interface WizardStep { label: string; completed: boolean; index: number; }',
        options,
      },
      // Two properties, coinciding with a generated type. Below the shape-match
      // threshold on purpose: `{ id, name }` is every entity in the system, and
      // flagging it would teach people to disable the rule.
      {
        code: 'interface Breadcrumb { id: string; name: string; }',
        options,
      },
      // A type alias that is not an object literal has no shape to mirror.
      {
        code: 'type Plan = string;',
        options,
      },
      // With no generated client to compare against, the rule protects nothing
      // rather than guessing.
      {
        code: 'interface OnboardOrganizationRequest { name: string; }',
        options: [{ generatedDir: resolve(__dirname, 'no-such-directory') }],
      },
    ],
    invalid: [
      {
        code: 'interface OnboardOrganizationRequest { name: string; }',
        options,
        errors: [{ messageId: 'mirrorsName' }],
      },
      // The usual disguises.
      {
        code: 'interface OnboardOrganizationRequestDto { name: string; }',
        options,
        errors: [{ messageId: 'mirrorsName' }],
      },
      {
        code: 'interface IProblem { code: string; }',
        options,
        errors: [{ messageId: 'mirrorsName' }],
      },
      {
        code: 'type CreatedClinicModel = { id: string; };',
        options,
        errors: [{ messageId: 'mirrorsName' }],
      },
      // Renamed, but property for property the generated request. This is what a
      // copy-paste actually looks like once someone has renamed it.
      {
        code: 'interface OnboardingForm { name: string; plan: string; clinics: unknown[]; staff: unknown[]; }',
        options,
        errors: [{ messageId: 'mirrorsShape' }],
      },
      {
        code: 'type ApiFailure = { code: string; status: number; title: string; traceId: string; type: string; };',
        options,
        errors: [{ messageId: 'mirrorsShape' }],
      },
    ],
  });
});

// The catalogue is read out of the generated files with a regular expression, on
// the grounds that they are uniform machine output. That assumption is only true
// until the generator's model template changes, and if it silently stopped
// matching, the rule would protect nothing and every test above would still
// pass. So this one reads the real generated client.
test('no-server-type-mirrors reads the real generated models', () => {
  ruleTester.run('no-server-type-mirrors', rule, {
    valid: [],
    invalid: [
      {
        code: 'interface StaffRequest { email: string; }',
        options: [
          {
            generatedDir: resolve(__dirname, '..', '..', 'projects/api-client/src/generated/model'),
          },
        ],
        errors: [{ messageId: 'mirrorsName' }],
      },
    ],
  });
});

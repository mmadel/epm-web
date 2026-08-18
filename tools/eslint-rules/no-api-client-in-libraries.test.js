'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { RuleTester } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('./no-api-client-in-libraries');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

/**
 * A stand-in for angular.json, so these cases do not depend on the workspace's own
 * shape. The last test uses the real file.
 */
const options = [
  {
    projects: {
      ui: 'library',
      core: 'library',
      'api-client': 'library',
      staff: 'application',
      platform: 'application',
    },
  },
];

const inUi = { filename: path.join('projects', 'ui', 'src', 'lib', 'thing.ts'), options };
const inCore = { filename: path.join('projects', 'core', 'src', 'lib', 'thing.ts'), options };
const inStaff = { filename: path.join('projects', 'staff', 'src', 'app', 'thing.ts'), options };
const inClient = { filename: path.join('projects', 'api-client', 'src', 'thing.ts'), options };

test('no-api-client-in-libraries', () => {
  ruleTester.run('no-api-client-in-libraries', rule, {
    valid: [
      // ------------------------------------------------------------------
      // THE CONTAINER IS ALLOWED TO CALL. An over-broad rule blocks the very
      // place the call is supposed to move to, which is worse than no rule -
      // it makes the boundary unimplementable.
      // ------------------------------------------------------------------
      { code: "import { BASE_PATH } from 'api-client';", ...inStaff },
      { code: "import { PlatformPracticesService } from 'api-client';", ...inStaff },

      // The generated client is allowed to be itself.
      { code: "import { Problem } from 'api-client';", ...inClient },

      // ------------------------------------------------------------------
      // A TYPE IS NOT A CALL. `ui` aliases the generated `Problem` model under a
      // local name, which is the opposite of the failure this rule guards: it is
      // what stops the library keeping its own copy of a server shape. `import
      // type` is erased by the compiler and ships nothing.
      // ------------------------------------------------------------------
      { code: "import type { Problem } from 'api-client';", ...inUi },
      { code: "import { type Problem, type ListedPlan } from 'api-client';", ...inUi },
      { code: "export type { Problem } from 'api-client';", ...inUi },

      // Anything that is not the generated client.
      { code: "import { LanguageService } from 'core';", ...inUi },
      { code: "import { Component } from '@angular/core';", ...inUi },
      { code: "import { Shell } from './shell';", ...inUi },

      // A file outside `projects/` is nobody's, and the rule says nothing.
      { code: "import { BASE_PATH } from 'api-client';", filename: 'tools/thing.ts', options },
    ],

    invalid: [
      // ------------------------------------------------------------------
      // THE WHOLE TICKET. Without a case here, a rule that matches nothing
      // passes every build and reads as coverage.
      // ------------------------------------------------------------------
      {
        code: "import { PlatformPracticesService } from 'api-client';",
        ...inUi,
        errors: [
          { messageId: 'apiClientInLibrary', data: { specifier: 'api-client', project: 'ui' } },
        ],
      },
      {
        code: "import { BASE_PATH } from 'api-client';",
        ...inCore,
        errors: [
          { messageId: 'apiClientInLibrary', data: { specifier: 'api-client', project: 'core' } },
        ],
      },

      // A default import, and a namespace one.
      {
        code: "import client from 'api-client';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },
      {
        code: "import * as client from 'api-client';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },

      // A side-effect import names nothing and still ships the module.
      { code: "import 'api-client';", ...inUi, errors: [{ messageId: 'apiClientInLibrary' }] },

      // Mixed: one type specifier and one value one. The value one is the whole
      // reason the exemption cannot be "mentions `type` somewhere".
      {
        code: "import { type Problem, BASE_PATH } from 'api-client';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },

      // A re-export is an import with the module's own name on it.
      {
        code: "export { BASE_PATH } from 'api-client';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },
      {
        code: "export * from 'api-client';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },

      // Deferred, which is how a rule matching only static imports gets bypassed.
      {
        code: "const client = await import('api-client');",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },

      // A deep path into the library, which is already a violation of its own but
      // must not be a way around this one.
      {
        code: "import { BASE_PATH } from 'api-client/variables';",
        ...inUi,
        errors: [{ messageId: 'apiClientInLibrary' }],
      },
    ],
  });
});

test('the rule reads the real angular.json, so a new project needs no listing', () => {
  // CRITERION 3. The cases above inject a project map because they are about the
  // rule's logic; this one is about the rule knowing the workspace without being
  // told. A project added to angular.json is covered the moment it is added, which
  // a hand-maintained set in this file could never promise.
  ruleTester.run('no-api-client-in-libraries', rule, {
    valid: [
      {
        code: "import { BASE_PATH } from 'api-client';",
        filename: path.join('projects', 'staff', 'src', 'app', 'thing.ts'),
      },
    ],
    invalid: [
      {
        code: "import { BASE_PATH } from 'api-client';",
        filename: path.join('projects', 'ui', 'src', 'lib', 'thing.ts'),
        errors: [{ messageId: 'apiClientInLibrary' }],
      },
    ],
  });
});

test('the message says which file, which project and what to do instead', () => {
  const { messages } = rule.meta;

  // Criterion 2. ESLint reports the file and the line; what the rule owes is the
  // rest - which boundary was crossed and where the call belongs instead. A message
  // that only says "not allowed" sends the reader to this file to find out why.
  assert.match(messages.apiClientInLibrary, /\{\{project\}\}/);
  assert.match(messages.apiClientInLibrary, /container/i);
  assert.match(messages.apiClientInLibrary, /import type/);
});

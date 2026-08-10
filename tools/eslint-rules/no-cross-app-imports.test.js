'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { RuleTester } = require('eslint');

const rule = require('./no-cross-app-imports');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

const STAFF_FILE = 'projects/staff/src/app/patients.ts';
const PATIENT_FILE = 'projects/patient/src/app/app.ts';
const PLATFORM_FILE = 'projects/platform/src/app/app.ts';
const CORE_FILE = 'projects/core/src/lib/core.ts';

// One file per application, three levels below `projects/`, so a specifier of
// `../../../<other>/src/app/app` resolves into the sibling application.
const APP_FILES = {
  staff: STAFF_FILE,
  patient: PATIENT_FILE,
  platform: PLATFORM_FILE,
};

// Three applications means three pairs and six directions, and every one of
// them is an error. These are generated rather than hand-written: a hand-written
// list is how a workspace ends up covering staff -> patient but not the reverse,
// and how the next application arrives with only the directions somebody
// happened to think of.
//
// The platform -> staff direction in here is the one that matters. It is the
// structural boundary PRODUCT.md relies on, not a shipping-size concern - see
// the call-out beside APP_PROJECTS in the rule.
const APP_NAMES = Object.keys(APP_FILES);
const CROSS_APP_DIRECTIONS = APP_NAMES.flatMap((from) =>
  APP_NAMES.filter((to) => to !== from).map((to) => ({ from, to })),
);

test('every ordered pair of applications is covered', () => {
  // n * (n - 1). Guards the generator itself: if this drops to five, the loop
  // above is broken and the suite below would still pass while testing less.
  assert.equal(CROSS_APP_DIRECTIONS.length, APP_NAMES.length * (APP_NAMES.length - 1));
  assert.equal(CROSS_APP_DIRECTIONS.length, 6);

  // The direction the whole ticket exists for, named explicitly so it cannot be
  // lost to a refactor of the generator.
  assert.ok(
    CROSS_APP_DIRECTIONS.some((d) => d.from === 'platform' && d.to === 'staff'),
    'platform -> staff must be one of the covered directions',
  );
});

test('applications and libraries match angular.json', () => {
  // The rule's sets are a hand-maintained mirror of angular.json. A project
  // missing from APP_PROJECTS is not merely unprotected - imports *into* it stop
  // being reported too, because the rule returns as soon as the target is
  // neither a known application nor a known library. That hole is silent, so it
  // is asserted here rather than left to the comment beside the sets.
  const angularJson = require(path.join(__dirname, '..', '..', 'angular.json'));

  const named = (type) =>
    Object.entries(angularJson.projects)
      .filter(([, project]) => project.projectType === type)
      .map(([name]) => name)
      .sort();

  const sorted = (set) => [...set].sort();

  assert.deepEqual(
    sorted(rule.APP_PROJECTS),
    named('application'),
    'APP_PROJECTS is out of step with angular.json - add the new application to the rule',
  );
  assert.deepEqual(
    sorted(rule.LIBRARY_PROJECTS),
    named('library'),
    'LIBRARY_PROJECTS is out of step with angular.json - add the new library to the rule',
  );
});

test('no-cross-app-imports', () => {
  ruleTester.run('no-cross-app-imports', rule, {
    valid: [
      // Libraries consumed through their public entry points (path mappings).
      { filename: STAFF_FILE, code: "import { Core } from 'core';" },
      { filename: PATIENT_FILE, code: "import { ApiClient } from 'api-client';" },
      { filename: PLATFORM_FILE, code: "import { Shell } from 'ui';" },
      // Intra-project relative imports.
      { filename: STAFF_FILE, code: "import { Shell } from '../shell';" },
      { filename: PLATFORM_FILE, code: "import { routes } from './app.routes';" },
      { filename: CORE_FILE, code: "import { token } from './tokens';" },
      // Third-party packages are untouched.
      { filename: STAFF_FILE, code: "import { Component } from '@angular/core';" },
    ],
    invalid: [
      // All six directions, in the plain static-import form.
      ...CROSS_APP_DIRECTIONS.map(({ from, to }) => ({
        filename: APP_FILES[from],
        code: `import { App } from '../../../${to}/src/app/app';`,
        errors: [{ messageId: 'crossApp' }],
      })),

      // The other specifier forms a cross-application import can take. Covered
      // once each rather than once per direction - the six above establish that
      // the direction table is complete, these establish that the shape of the
      // specifier does not let one through.
      {
        filename: STAFF_FILE,
        code: "import { App } from 'projects/patient/src/app/app';",
        errors: [{ messageId: 'crossApp' }],
      },
      {
        filename: PATIENT_FILE,
        code: "const mod = await import('projects/staff/src/app/app');",
        errors: [{ messageId: 'crossApp' }],
      },
      {
        filename: PLATFORM_FILE,
        code: "const mod = await import('projects/staff/src/app/patients');",
        errors: [{ messageId: 'crossApp' }],
      },
      {
        filename: PLATFORM_FILE,
        code: "export * from '../../../staff/src/app/patients';",
        errors: [{ messageId: 'crossApp' }],
      },

      // Reaching past a library's public entry point.
      {
        filename: STAFF_FILE,
        code: "export { Core } from '../../../core/src/lib/core';",
        errors: [{ messageId: 'deepLibrary' }],
      },
      {
        filename: PATIENT_FILE,
        code: "import { Button } from 'projects/ui/src/lib/button';",
        errors: [{ messageId: 'deepLibrary' }],
      },
      {
        filename: PLATFORM_FILE,
        code: "import { Button } from 'projects/ui/src/lib/button';",
        errors: [{ messageId: 'deepLibrary' }],
      },
    ],
  });
});

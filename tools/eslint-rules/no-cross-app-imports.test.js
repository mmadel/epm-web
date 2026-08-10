'use strict';

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

test('no-cross-app-imports', () => {
  ruleTester.run('no-cross-app-imports', rule, {
    valid: [
      // Libraries consumed through their public entry points (path mappings).
      { filename: STAFF_FILE, code: "import { Core } from 'core';" },
      { filename: PATIENT_FILE, code: "import { ApiClient } from 'api-client';" },
      // Intra-project relative imports.
      { filename: STAFF_FILE, code: "import { Shell } from '../shell';" },
      { filename: CORE_FILE, code: "import { token } from './tokens';" },
      // Third-party packages are untouched.
      { filename: STAFF_FILE, code: "import { Component } from '@angular/core';" },
    ],
    invalid: [
      {
        filename: STAFF_FILE,
        code: "import { App } from '../../../patient/src/app/app';",
        errors: [{ messageId: 'crossApp' }],
      },
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
      // Both directions across the platform boundary. Before `platform` was added
      // to APP_PROJECTS the first of these passed silently: an unknown target is
      // neither an application nor a library, so the rule returned without
      // reporting. These two cases are what stop that reopening for the next
      // application somebody adds.
      {
        filename: STAFF_FILE,
        code: "import { App } from '../../../platform/src/app/app';",
        errors: [{ messageId: 'crossApp' }],
      },
      {
        filename: PLATFORM_FILE,
        code: "import { App } from '../../../staff/src/app/app';",
        errors: [{ messageId: 'crossApp' }],
      },
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
    ],
  });
});

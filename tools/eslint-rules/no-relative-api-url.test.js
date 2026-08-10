'use strict';

const test = require('node:test');
const { RuleTester } = require('eslint');

const rule = require('./no-relative-api-url');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

test('no-relative-api-url', () => {
  ruleTester.run('no-relative-api-url', rule, {
    valid: [
      // Base URL comes from injected config - the whole point of the rule.
      { code: "this.http.get(this.config.apiBaseUrl + '/patients');" },
      { code: 'fetch(`${this.config.apiBaseUrl}/api/patients`);' },
      // Absolute URLs are not origin-relative.
      { code: "const patientsUrl = 'https://api.example.com/api/patients';" },
      // Not an HTTP call shape and not a URL-ish binding.
      { code: "logger.debug('/api/patients');" },
    ],
    invalid: [
      {
        code: "this.http.get('/api/patients');",
        errors: [{ messageId: 'relativeApiUrl' }],
      },
      {
        code: "fetch('/api/patients');",
        errors: [{ messageId: 'relativeApiUrl' }],
      },
      {
        code: 'httpClient.request(`/api/patients/${id}`);',
        errors: [{ messageId: 'relativeApiUrl' }],
      },
      {
        // The obvious dodge: hoist the string out of the call.
        code: "const patientsEndpoint = '/api/patients';",
        errors: [{ messageId: 'relativeApiUrlBinding' }],
      },
      {
        code: "class PatientsService { baseUrl = '/api'; }",
        errors: [{ messageId: 'relativeApiUrlBinding' }],
      },
    ],
  });
});

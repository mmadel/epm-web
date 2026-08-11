/**
 * Local ESLint plugin holding the workspace's own enforcement rules.
 *
 * Plain CommonJS on purpose: no build step, the root `eslint.config.mjs`
 * imports this file directly.
 */

'use strict';

const noRelativeApiUrl = require('./no-relative-api-url');
const noCrossAppImports = require('./no-cross-app-imports');
const noServerTypeMirrors = require('./no-server-type-mirrors');

module.exports = {
  meta: {
    name: 'epm',
    version: '1.0.0',
  },
  rules: {
    'no-relative-api-url': noRelativeApiUrl,
    'no-cross-app-imports': noCrossAppImports,
    'no-server-type-mirrors': noServerTypeMirrors,
  },
};

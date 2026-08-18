// Single, workspace-wide ESLint flat config.
//
// There are deliberately no per-project `eslint.config.*` files: every project
// is covered from here with file-glob-scoped config objects, so the workspace
// rules cannot drift apart project by project.
import { createRequire } from 'node:module';

import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

// The local rules are plain CommonJS with no build step.
const require = createRequire(import.meta.url);
const epm = require('./tools/eslint-rules/index.js');

export default tseslint.config(
  {
    name: 'epm/ignores',
    ignores: [
      'dist/**',
      'node_modules/**',
      '.angular/**',
      'coverage/**',
      'out-tsc/**',

      // The generated API client (ticket T-85). It is committed, so ESLint would
      // otherwise walk it - and it is machine output, so the only two outcomes
      // are both bad: a rule fires on code nobody wrote and cannot fix, or
      // someone applies `--fix` and the file no longer matches its own
      // regeneration, which is the difference CI's staleness check reports as a
      // stale client. Regenerate it with `npm run generate:api`; never edit it.
      'projects/api-client/src/generated/**',
    ],
  },

  // ---------------------------------------------------------------------------
  // TypeScript sources across every project (apps and libraries).
  // ---------------------------------------------------------------------------
  {
    name: 'epm/ts',
    files: ['projects/**/*.ts'],
    extends: [
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: { epm },
    rules: {
      // The workspace enforcement rules are errors, never warnings.
      'epm/no-relative-api-url': 'error',
      'epm/no-cross-app-imports': 'error',
      'epm/no-server-type-mirrors': 'error',

      // APPLIED TO EVERY PROJECT, NOT TO A NAMED ONE. The rule works out from
      // angular.json whether the file it is looking at belongs to a library, so a
      // project added tomorrow is covered without being listed here or anywhere
      // else - which is the whole of T-99 criterion 3.
      'epm/no-api-client-in-libraries': 'error',
    },
  },

  // Application component/directive selectors use the `app` prefix.
  {
    name: 'epm/ts-apps',
    files: ['projects/staff/**/*.ts', 'projects/patient/**/*.ts', 'projects/platform/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },

  // Library component/directive selectors use the `lib` prefix.
  {
    name: 'epm/ts-libraries',
    files: ['projects/core/**/*.ts', 'projects/ui/**/*.ts', 'projects/api-client/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'lib', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'lib', style: 'camelCase' },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Angular templates across every project.
  // ---------------------------------------------------------------------------
  {
    name: 'epm/html',
    files: ['projects/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },

  // ---------------------------------------------------------------------------
  // The local rule implementations and their tests are plain Node CommonJS.
  // ---------------------------------------------------------------------------
  {
    name: 'epm/tools',
    files: ['tools/**/*.js'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Prettier owns formatting; this must stay last so it can switch off any
  // stylistic rule the configs above turned on.
  eslintConfigPrettier,
);

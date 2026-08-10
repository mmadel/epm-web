/**
 * ESLint rule: no-cross-app-imports
 *
 * Project boundaries in this workspace:
 *   - `projects/staff`, `projects/patient` and `projects/platform` are sibling
 *     applications: three pairs, six directions, and no application may import
 *     from another. They ship separately (patient is wrapped with Capacitor,
 *     platform is an internal console) and shared code belongs in a library.
 *   - `projects/core`, `projects/ui` and `projects/api-client` are libraries
 *     consumed through their public entry points (`core`, `ui`, `api-client`
 *     path mappings). Reaching into `projects/<lib>/src/...` bypasses the
 *     public API and breaks the ng-packagr build contract.
 */

'use strict';

const path = require('path');

// Every application in the workspace. A project missing from this set is not
// merely unprotected, it is a hole in both directions: an import *into* it is
// not reported either, because the rule stops as soon as the target is not a
// known application or library. Add an application here in the same change that
// adds it to angular.json - `applications match angular.json` in the tests
// fails the build if you forget.
//
// `platform` -> `staff` IS NOT A TIDINESS RULE. DO NOT RELAX IT.
//
// PRODUCT.md places platform administrators outside every practice so that
// "whoever runs the platform must never be able to open a patient's chart" is
// structural rather than a rule someone could relax. A single import from
// `platform` into `staff` pulls the staff surface into the platform bundle and
// leaves that boundary one role-gating defect away from failing. The other five
// directions are about shipping separately; this one is about patient data.
// If you think you need it, the shared code belongs in `ui` or `core`.
const APP_PROJECTS = new Set(['staff', 'patient', 'platform']);
const LIBRARY_PROJECTS = new Set(['core', 'ui', 'api-client']);

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Extracts the workspace project name from a path containing a
 * `projects/<name>` segment. Returns undefined when there is none.
 */
function projectOf(posixPath) {
  const match = /(?:^|\/)projects\/([^/]+)(?:\/|$)/.exec(posixPath);
  return match ? match[1] : undefined;
}

function isRelative(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.';
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow imports that cross application project boundaries or reach into another project’s internals.',
    },
    schema: [],
    messages: {
      crossApp:
        "Cross-project import from '{{from}}' into application '{{to}}': '{{specifier}}'. " +
        'projects/{{from}} and projects/{{to}} are separately shipped applications and must ' +
        'never import each other - promote the shared code into a library ' +
        '(core, ui or api-client) instead.',
      deepLibrary:
        "Deep import from '{{from}}' into the internals of library '{{to}}': '{{specifier}}'. " +
        "Reaching projects/{{to}}/src/... bypasses the library's public entry point - import " +
        "from '{{to}}' (the workspace path mapping) instead.",
    },
  },

  create(context) {
    const filename = toPosix(context.filename ?? context.getFilename());
    const fromProject = projectOf(filename);

    // Files outside `projects/` (tooling, config) are not subject to the rule.
    if (!fromProject) {
      return {};
    }

    function resolveTargetProject(specifier) {
      if (isRelative(specifier)) {
        const resolved = toPosix(
          path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier)),
        );
        return projectOf(resolved);
      }
      // Non-relative specifiers that name a project path directly, e.g.
      // 'projects/patient/src/app/app' or '@app/../projects/ui/src/lib/x'.
      return projectOf(toPosix(specifier));
    }

    function check(node, sourceNode) {
      if (!sourceNode || sourceNode.type !== 'Literal' || typeof sourceNode.value !== 'string') {
        return;
      }
      const specifier = sourceNode.value;
      const toProject = resolveTargetProject(specifier);

      if (!toProject || toProject === fromProject) {
        return;
      }

      if (APP_PROJECTS.has(toProject)) {
        context.report({
          node: sourceNode,
          messageId: 'crossApp',
          data: { from: fromProject, to: toProject, specifier },
        });
        return;
      }

      if (LIBRARY_PROJECTS.has(toProject)) {
        context.report({
          node: sourceNode,
          messageId: 'deepLibrary',
          data: { from: fromProject, to: toProject, specifier },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
    };
  },
};

// Exposed for the drift test, which asserts these still match angular.json.
// ESLint reads only `meta` and `create` off a rule module and ignores the rest.
module.exports.APP_PROJECTS = APP_PROJECTS;
module.exports.LIBRARY_PROJECTS = LIBRARY_PROJECTS;

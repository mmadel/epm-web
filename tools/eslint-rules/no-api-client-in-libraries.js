/**
 * ESLint rule: no-api-client-in-libraries
 *
 * A shared library must not reach the API.
 *
 * WHY THE BOUNDARY EXISTS. `ui` is presentational and shared. A component that
 * fetches cannot be rendered in a test, in a second application, or in isolation
 * without a server standing behind it - and every application that mounts it inherits
 * a call it did not ask for. The call belongs one level up, in a container in the
 * application that wanted the data.
 *
 * IT IS DERIVED FROM angular.json, NOT FROM A LIST HERE. Which projects are
 * libraries is already written down once, in the workspace configuration, and a
 * second copy in this file would be right until the day somebody adds a library. So
 * the rule reads it: a project declared `projectType: library` may not import the
 * generated client, an application may, and a project added tomorrow is covered
 * without being named anywhere (T-99 criterion 3).
 *
 * THE GENERATED CLIENT IS EXEMPT FROM ITSELF, for the obvious reason.
 *
 * A TYPE IS NOT A CALL, and that is this rule's one deliberate exemption. `import
 * type` is erased by the compiler and ships nothing; a service, a token or a constant
 * is code that runs and can open a request. `ui` already aliases the generated
 * `Problem` model under a local name, which is the OPPOSITE of what this guards -
 * it is what stops the library keeping its own copy of a server shape that goes stale
 * silently when the backend renames a member. T-99 §10 asks for that call to be made
 * deliberately rather than inherited: it is made here, and it is why the rule counts
 * value imports rather than mentions.
 *
 * What it therefore reports: a plain import, a default or namespace import, a bare
 * side-effect import, a mixed import with one value specifier in it, a re-export in
 * either spelling, a deferred `import()`, and a deep path into the client.
 */

'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

/** The library whose imports this rule is about. */
const CLIENT = 'api-client';

/** angular.json, read once per working directory rather than once per file. */
const workspaces = new Map();

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

/**
 * The workspace project a file belongs to, or `undefined` for a file that is in no
 * project - a script under `tools/`, a root config. The rule says nothing about
 * those, because they ship nothing.
 */
function projectOf(filename) {
  const match = /(?:^|\/)projects\/([^/]+)(?:\/|$)/.exec(toPosix(filename));

  return match ? match[1] : undefined;
}

/** `{ <project>: 'library' | 'application' }`, from the workspace configuration. */
function projectTypes(cwd) {
  if (!workspaces.has(cwd)) {
    const { projects } = JSON.parse(readFileSync(join(cwd, 'angular.json'), 'utf8'));

    workspaces.set(
      cwd,
      Object.fromEntries(
        Object.entries(projects).map(([name, project]) => [name, project.projectType]),
      ),
    );
  }

  return workspaces.get(cwd);
}

/** Whether a specifier names the generated client, including a deep path into it. */
function namesTheClient(specifier) {
  return specifier === CLIENT || specifier.startsWith(`${CLIENT}/`);
}

/**
 * Whether a declaration brings in nothing that survives compilation.
 *
 * `import type … ` is the whole declaration; `import { type A, type B }` is every
 * specifier. A declaration with no specifiers at all is a side-effect import, which
 * survives and is the reason this cannot simply count type specifiers.
 */
function isTypeOnly(node) {
  if (node.importKind === 'type' || node.exportKind === 'type') {
    return true;
  }

  const specifiers = node.specifiers ?? [];

  return specifiers.length > 0 && specifiers.every((specifier) => specifier.importKind === 'type');
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing the generated API client from a shared library. Libraries are presentational and are mounted by more than one application; the call belongs in a container in the application that wanted the data.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Tests inject the map rather than depending on the workspace's own shape.
          // Left out, the rule reads angular.json, which is the point of it.
          projects: { type: 'object', additionalProperties: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      apiClientInLibrary:
        "'{{specifier}}' is imported by library '{{project}}', which may not reach the API. " +
        'A shared library is mounted by more than one application, and one that fetches ' +
        'cannot be rendered in a test or a second application without a server behind it - ' +
        'move the call into a container in the application that wanted the data. ' +
        'A type is not a call: `import type` from api-client is allowed, and is how this ' +
        'library reuses a server shape without keeping a copy of it.',
    },
  },

  create(context) {
    const project = projectOf(context.filename ?? context.getFilename());

    if (project === undefined || project === CLIENT) {
      return {};
    }

    const types = context.options[0]?.projects ?? projectTypes(context.cwd);

    if (types[project] !== 'library') {
      return {};
    }

    function check(node, source) {
      if (source === null || source === undefined || !namesTheClient(source.value)) {
        return;
      }

      if (isTypeOnly(node)) {
        return;
      }

      context.report({
        node: source,
        messageId: 'apiClientInLibrary',
        data: { specifier: source.value, project },
      });
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),

      // `await import('api-client')` - a rule that matched only static imports would
      // be one rewrite away from being bypassed.
      ImportExpression: (node) =>
        node.source?.type === 'Literal' ? check(node, node.source) : undefined,
    };
  },
};

/**
 * ESLint rule: no-server-type-mirrors
 *
 * A hand-written interface may not mirror a type the API client generates.
 *
 * The generated client (ticket T-85) exists so that every request and response
 * shape in this workspace has exactly one definition, and that definition is the
 * server's own specification. A second, hand-written copy of a shape defeats
 * that completely, and does it quietly: the copy keeps compiling after the
 * backend renames a field, so the build stays green and the mismatch is
 * discovered by a user instead. A duplicate is worse than no type at all,
 * because it is a type that lies.
 *
 * If a shape is needed, import it from `api-client`.
 *
 * Two things are caught:
 *
 *   1. THE NAME. `OnboardOrganizationRequest` declared anywhere outside the
 *      generated directory - including the usual disguises, `IFoo`, `FooDto`,
 *      `FooModel`, `FooPayload`.
 *   2. THE SHAPE. An interface with a different name but exactly the property
 *      names of a generated type, which is what a copy-paste actually looks
 *      like after someone renames it.
 *
 * The shape check applies only to generated types with three or more properties.
 * Below that, real shapes collide by coincidence - `{ id, name }` is every
 * entity in the system, and a rule that flags it teaches people to disable the
 * rule. Small types are still covered by the name check.
 */

'use strict';

const { readdirSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

/** Where the generated models live, relative to the workspace root. */
const DEFAULT_GENERATED_DIR = 'projects/api-client/src/generated/model';

/** Below this, property-name sets collide by coincidence rather than by copying. */
const MIN_PROPERTIES_FOR_SHAPE_MATCH = 3;

/** Decorations people add to a copied type so that the name does not clash. */
const DISGUISES = [/^I(?=[A-Z])/, /Dto$/i, /Model$/i, /Payload$/i, /Body$/i, /Interface$/i];

/**
 * Reads the generated models and returns `[{ name, properties }]`.
 *
 * Deliberately a regular expression rather than the TypeScript parser: the input
 * is machine output from one pinned generator version, so it is uniform - and a
 * lint rule that loads the compiler to read six small files would cost more than
 * every other rule in the workspace put together. If the generator's model
 * template ever changes shape, this returns fewer types and the rule quietly
 * protects less, so `no-server-type-mirrors.test.js` asserts the parse against a
 * sample of the real output.
 */
function readGeneratedTypes(directory) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    // No generated client in this checkout yet. The rule cannot know what it is
    // protecting, so it protects nothing rather than guessing.
    return [];
  }

  const types = [];

  for (const entry of entries) {
    if (!entry.endsWith('.ts')) {
      continue;
    }

    const source = readFileSync(join(directory, entry), 'utf8');
    const interfacePattern = /export interface (\w+)\s*\{([\s\S]*?)\n\}/g;

    let match;
    while ((match = interfacePattern.exec(source)) !== null) {
      const [, name, body] = match;
      const properties = new Set();
      // An index signature (`[key: string]: unknown`) is not a property name and
      // does not start with an identifier character, so it is skipped here.
      const propertyPattern = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/gm;

      let property;
      while ((property = propertyPattern.exec(body)) !== null) {
        properties.add(property[1]);
      }

      types.push({ name, properties });
    }
  }

  return types;
}

/** Strips the decorations in DISGUISES, one layer, so `IFooDto` reads as `Foo`. */
function undisguise(name) {
  let stripped = name;
  for (const disguise of DISGUISES) {
    stripped = stripped.replace(disguise, '');
  }
  return stripped;
}

function sameProperties(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const property of a) {
    if (!b.has(property)) {
      return false;
    }
  }
  return true;
}

/** Property names declared by an interface body or a type literal. */
function declaredProperties(members) {
  const properties = new Set();
  for (const member of members) {
    if (member.type !== 'TSPropertySignature' || member.computed) {
      continue;
    }
    if (member.key.type === 'Identifier') {
      properties.add(member.key.name);
    } else if (member.key.type === 'Literal' && typeof member.key.value === 'string') {
      properties.add(member.key.value);
    }
  }
  return properties;
}

const WHY =
  'The generated API client is the only description of a server shape in this workspace, so ' +
  'that a field the backend renames breaks the build instead of reaching a user. A hand-written ' +
  'copy keeps compiling after that rename, which turns a build failure into a runtime one. ' +
  'Import it from "api-client" instead, and run `npm run generate:api` if it is missing.';

// The catalogue is read once per directory rather than once per linted file:
// ESLint calls `create` for every file in the workspace, and the generated models
// cannot change while it runs.
const catalogueCache = new Map();

function catalogueFor(directory) {
  if (!catalogueCache.has(directory)) {
    catalogueCache.set(directory, readGeneratedTypes(directory));
  }
  return catalogueCache.get(directory);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hand-written interfaces that duplicate a generated API request or response type.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Tests pass the catalogue directly so they do not depend on a
          // generated client being present in the checkout.
          types: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                properties: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
          generatedDir: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mirrorsName: '"{{declared}}" duplicates the generated type "{{generated}}". ' + WHY,
      mirrorsShape:
        '"{{declared}}" declares exactly the properties of the generated type "{{generated}}" ' +
        '({{properties}}). ' +
        WHY,
    },
  },

  create(context) {
    const options = context.options[0] ?? {};

    const generated = options.types
      ? options.types.map((type) => ({
          name: type.name,
          properties: new Set(type.properties ?? []),
        }))
      : // `resolve` rather than `join` so that a test may pass an absolute path.
        catalogueFor(resolve(context.cwd, options.generatedDir ?? DEFAULT_GENERATED_DIR));

    if (generated.length === 0) {
      return {};
    }

    const byName = new Map(generated.map((type) => [type.name.toLowerCase(), type.name]));

    function check(node, members) {
      const declared = node.id.name;

      const generatedName = byName.get(undisguise(declared).toLowerCase());
      if (generatedName) {
        context.report({
          node: node.id,
          messageId: 'mirrorsName',
          data: { declared, generated: generatedName },
        });
        return;
      }

      const properties = declaredProperties(members);
      if (properties.size < MIN_PROPERTIES_FOR_SHAPE_MATCH) {
        return;
      }

      for (const type of generated) {
        if (
          type.properties.size >= MIN_PROPERTIES_FOR_SHAPE_MATCH &&
          sameProperties(properties, type.properties)
        ) {
          context.report({
            node: node.id,
            messageId: 'mirrorsShape',
            data: {
              declared,
              generated: type.name,
              properties: [...type.properties].sort().join(', '),
            },
          });
          return;
        }
      }
    }

    return {
      TSInterfaceDeclaration(node) {
        check(node, node.body.body);
      },
      TSTypeAliasDeclaration(node) {
        if (node.typeAnnotation.type === 'TSTypeLiteral') {
          check(node, node.typeAnnotation.members);
        }
      },
    };
  },
};

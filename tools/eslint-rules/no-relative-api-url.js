/**
 * ESLint rule: no-relative-api-url
 *
 * Relative `/api...` URLs are forbidden as HTTP request URLs.
 *
 * The patient app is wrapped with Capacitor and served from a custom-scheme
 * origin (`capacitor://localhost`). A relative path such as `/api/patients`
 * resolves against that origin, not against the backend, so the request goes
 * nowhere and the failure is silent at runtime. The base URL must come from the
 * injected configuration token (ticket F-01), never from a hard-coded literal.
 */

'use strict';

/** HTTP-ish method names on any receiver: this.http.get(...), client.post(...), ... */
const HTTP_METHOD_NAMES = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'request',
  'jsonp',
]);

/** Variable / property names that make a string "a URL" regardless of call shape. */
const URL_NAME_PATTERN = /url|endpoint|path/i;

/**
 * A relative API URL is a path-absolute string that targets `/api`.
 * Absolute URLs (`https://host/api/x`) are fine - they are not origin-relative.
 */
function isRelativeApiUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return false;
  }
  return /^\/api(?:[/?#]|$)/.test(value) || value.includes('/api/');
}

/**
 * Returns the leading static text of a Literal or TemplateLiteral.
 *
 * Only the leading static part matters: `/api/patients/${id}` is
 * origin-relative and must be flagged, while `${base}/api/patients` already
 * derives its origin from `base` and must not be.
 */
function getUrlishValue(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis.length > 0 ? (node.quasis[0].value.cooked ?? '') : '';
  }
  return undefined;
}

function getCalleeName(callee) {
  if (!callee) {
    return undefined;
  }
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property.type === 'Identifier' ? callee.property.name : undefined;
  }
  return undefined;
}

function getBoundName(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

/** Is `node` used directly as an argument of an HTTP call? */
function isHttpCallArgument(node) {
  const parent = node.parent;
  if (!parent || parent.type !== 'CallExpression' || !parent.arguments.includes(node)) {
    return false;
  }
  const name = getCalleeName(parent.callee);
  if (!name) {
    return false;
  }
  if (name === 'fetch') {
    return true;
  }
  // Method-call shape only: `receiver.get(...)`. A bare `get('/api/x')` is not
  // assumed to be HTTP. This call-shape heuristic is deliberate - no type-aware
  // resolution is attempted.
  return parent.callee.type === 'MemberExpression' && HTTP_METHOD_NAMES.has(name);
}

/** Is `node` bound to a name that reads like a URL? Returns the name, or undefined. */
function urlishBindingName(node) {
  const parent = node.parent;
  if (!parent) {
    return undefined;
  }

  let name;
  switch (parent.type) {
    case 'VariableDeclarator':
      if (parent.init === node) {
        name = getBoundName(parent.id);
      }
      break;
    case 'PropertyDefinition':
    case 'Property':
      if (parent.value === node) {
        name = getBoundName(parent.key);
      }
      break;
    case 'AssignmentExpression':
      if (parent.right === node) {
        name = getBoundName(parent.left);
      }
      break;
    default:
      break;
  }

  return name && URL_NAME_PATTERN.test(name) ? name : undefined;
}

const WHY =
  'The patient app runs from a custom-scheme origin (capacitor://) where a path-relative ' +
  '"/api" URL resolves against that origin instead of the backend - it resolves to nothing ' +
  'and the failure is silent at runtime. The base URL must come from the injected API ' +
  'configuration token (ticket F-01), not from a hard-coded relative path.';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative "/api" URLs in HTTP calls and URL-ish bindings; the API base URL must come from the injected config token.',
    },
    schema: [],
    messages: {
      relativeApiUrl: 'Relative API URL "{{url}}" is not allowed. ' + WHY,
      relativeApiUrlBinding:
        'Relative API URL "{{url}}" assigned to "{{name}}" is not allowed. ' + WHY,
    },
  },

  create(context) {
    function check(node) {
      const value = getUrlishValue(node);
      if (value === undefined || !isRelativeApiUrl(value)) {
        return;
      }

      if (isHttpCallArgument(node)) {
        context.report({ node, messageId: 'relativeApiUrl', data: { url: value } });
        return;
      }

      const name = urlishBindingName(node);
      if (name) {
        context.report({
          node,
          messageId: 'relativeApiUrlBinding',
          data: { url: value, name },
        });
      }
    }

    return {
      Literal: check,
      TemplateLiteral: check,
    };
  },
};

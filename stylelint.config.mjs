// Single, workspace-wide Stylelint config covering every project's SCSS.
//
// The point of this file is the direction-agnostic layout rules below. Arabic
// and English are both first-class in this product, so direction is a property
// of the whole product rather than of a locale-specific stylesheet. A mirrored
// RTL stylesheet is a second place every layout rule lives - the two drift, and
// the Arabic version quietly becomes the worse one. Logical properties keep
// there being exactly one place.

const RTL_REASON =
  'Arabic and English are both first-class here, so direction is a property of the whole ' +
  'product. A mirrored RTL stylesheet would be a second place every layout rule lives; the two ' +
  'drift and the Arabic version quietly becomes the worse one. Use logical properties instead.';

/** Physical property -> the logical property that replaces it. */
const LOGICAL_EQUIVALENT = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  left: 'inset-inline-start',
  right: 'inset-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
};

export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**'],
  rules: {
    'property-disallowed-list': [
      Object.keys(LOGICAL_EQUIVALENT),
      {
        message: (property) => {
          const logical =
            LOGICAL_EQUIVALENT[String(property).toLowerCase()] ?? 'a logical property';
          return `Direction-specific property "${property}" is not allowed - use "${logical}". ${RTL_REASON}`;
        },
      },
    ],

    'declaration-property-value-disallowed-list': [
      { 'text-align': ['left', 'right'] },
      {
        message: (property, value) => {
          const logical = String(value).toLowerCase() === 'left' ? 'start' : 'end';
          return (
            `Direction-specific value "${property}: ${value}" is not allowed - use ` +
            `"text-align: ${logical}". ${RTL_REASON}`
          );
        },
      },
    ],

    // The scaffold uses plain kebab-case class names; the preset's stricter
    // pattern rules are not what this ticket is about.
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
    'no-descending-specificity': null,
    // The generated component stylesheets start out empty and that is fine.
    'no-empty-source': null,
  },
};

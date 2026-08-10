import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * The environments this product is deployed to.
 *
 * A closed set, and a `const` array rather than a bare union so the four names
 * exist at runtime for {@link resolveEnvironmentName} to check against - one
 * list, not a type and a duplicate of it that can disagree.
 */
export const ENVIRONMENT_NAMES = ['local', 'development', 'staging', 'production'] as const;

/** One of the four environments. */
export type EnvironmentName = (typeof ENVIRONMENT_NAMES)[number];

/**
 * What the console actually holds: one of the four, or the fact that the build
 * did not say.
 *
 * `'unknown'` IS A VALUE, NOT AN ABSENCE. Not `null`, not an empty string, not
 * an `EnvironmentName | undefined` that every reader has to remember to handle.
 * It is the same decision `PlatformAdminSession` makes about the organization it
 * does not have (P-02.2): an absence modelled as a nullish value is an absence
 * somebody forgets, and the reader that forgets is the one that renders nothing
 * where the environment should be.
 *
 * That matters here more than most places, because a MISSING environment mark
 * and a BROKEN one look identical, and the default state of every
 * misconfiguration would be a header that looks like production. So there is no
 * state in which nothing renders.
 */
export type ResolvedEnvironmentName = EnvironmentName | 'unknown';

/**
 * Narrows whatever the build wrote into the generated environment file.
 *
 * The build deliberately does not validate the value (see
 * scripts/generate-environment.mjs), so this is where an unset variable, a typo
 * and a name from some future deployment topology all land - and they all land
 * on `'unknown'`, which the console renders with production's treatment. The
 * risk is one-sided: mistaking staging for production costs a moment, and
 * mistaking production for staging creates a practice with real rows in it.
 */
export function resolveEnvironmentName(raw: unknown): ResolvedEnvironmentName {
  return ENVIRONMENT_NAMES.includes(raw as EnvironmentName) ? (raw as EnvironmentName) : 'unknown';
}

/**
 * The environment this bundle was built for.
 *
 * A token rather than an imported constant, for the reason `API_BASE_URL` is
 * one: the generated file is a build artefact, and a component that imports it
 * directly can only ever be tested in whichever environment the last build wrote
 * - which, for the one component whose whole job is to be right about the
 * environment, is not good enough.
 */
export const ENVIRONMENT_NAME = new InjectionToken<ResolvedEnvironmentName>('ENVIRONMENT_NAME');

/**
 * Configures the environment the console believes it is pointed at.
 *
 * @param raw The build's value, unnarrowed. Anything unrecognised becomes
 *   `'unknown'` here rather than at the point of use, so there is one place
 *   the narrowing happens and no screen has to repeat it.
 */
export function provideEnvironmentName(raw: unknown): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ENVIRONMENT_NAME, useValue: resolveEnvironmentName(raw) },
  ]);
}

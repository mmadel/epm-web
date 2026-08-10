import { ResolvedEnvironmentName } from '../environment/environment-name';

/** The three status treatments the environments are drawn from. */
export type EnvironmentTone = 'neutral' | 'info' | 'danger' | 'warning';

/** How one environment is presented, everywhere it is presented. */
export interface EnvironmentPresentation {
  /** The word on the chip and in the browser tab. Sentence case, English. */
  readonly label: string;
  /** Which status treatment the chip wears. */
  readonly tone: EnvironmentTone;
  /** Whether the whole page carries the edge strip above the header. */
  readonly edge: boolean;
}

/**
 * How each environment is presented.
 *
 * One table, read by the chip, by the layout that draws the edge and by the
 * document title, so those three cannot disagree about what environment the
 * console is in. A `Record` over the resolved names, so adding an environment is
 * a compile error here rather than a chip that renders blank.
 *
 * COLOUR IS NEVER THE ONLY CARRIER. The chip names the environment in words;
 * the tint and the dot are the second and third channels. A reader who cannot
 * separate the staging amber from the production red still reads "Staging".
 *
 * `unknown` IS DRAWN AS PRODUCTION. It is the most dangerous thing the console
 * can be, not the least: a build with no environment set is a build nobody
 * checked, and the failure that matters is treating production as something
 * safe. It keeps its own word, though - `Unknown`, never `Production` - because
 * a chip that claims to know is worse than one that admits it does not.
 */
const PRESENTATION: Readonly<Record<ResolvedEnvironmentName, EnvironmentPresentation>> = {
  // Local and development announce themselves through the data in them, so they
  // get the chip and not the edge. The edge is for the two that look real.
  local: { label: 'Local', tone: 'neutral', edge: false },
  development: { label: 'Development', tone: 'info', edge: false },
  staging: { label: 'Staging', tone: 'warning', edge: true },
  production: { label: 'Production', tone: 'danger', edge: true },
  unknown: { label: 'Unknown', tone: 'danger', edge: true },
};

/** How to present `environment`. */
export function environmentPresentation(
  environment: ResolvedEnvironmentName,
): EnvironmentPresentation {
  return PRESENTATION[environment];
}

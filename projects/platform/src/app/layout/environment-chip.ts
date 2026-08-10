import { Component, inject } from '@angular/core';

import { ENVIRONMENT_NAME } from '../environment/environment-name';
import { environmentPresentation } from './environment-presentation';

/**
 * Names the environment the console is pointed at.
 *
 * IT ALWAYS RENDERS, PRODUCTION INCLUDED. The obvious design - mark the unsafe
 * environments and leave production plain - was rejected: a missing chip and a
 * broken chip look identical, so the default state of every misconfiguration
 * would be a header that reads as production. Making production the most heavily
 * marked state means there is nothing to fail to render.
 *
 * The word is the primary carrier; the tint and the dot repeat it. See
 * environment-presentation.ts for the table and the reasoning behind each row.
 *
 * The environment is injected rather than an input: it is a fact about the
 * build, one per running application, and an input would let a screen pass a
 * different one.
 */
@Component({
  selector: 'app-environment-chip',
  templateUrl: './environment-chip.html',
  styleUrl: './environment-chip.scss',
})
export class EnvironmentChip {
  protected readonly presentation = environmentPresentation(inject(ENVIRONMENT_NAME));
}

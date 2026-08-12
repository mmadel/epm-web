import { Component, input, output } from '@angular/core';
import { OnboardOrganizationResponse } from 'api-client';

/**
 * What was created, with every id the server issued.
 *
 * IT REPLACES THE FORM RATHER THAN JOINING IT. The practice exists; a filled-in
 * form left beside this panel is an invitation to press create again, which is the
 * one thing this screen must not make easy.
 *
 * A 201 and a 200 both arrive here and are rendered identically (criterion 4). A
 * 200 means the key has been seen before - the reader pressed create twice, or a
 * retry followed a request that had in fact succeeded - and the practice they are
 * looking at is theirs either way. Telling them "this already existed" would
 * describe a mechanism rather than their practice.
 *
 * It is a component of its own rather than a block in the page for the ordinary
 * reason: it is a second screen the same route shows, with nothing in common with
 * the form's markup or its styling.
 */
@Component({
  selector: 'app-created-panel',
  templateUrl: './created-panel.html',
  styleUrl: './created-panel.scss',
})
export class CreatedPanel {
  /** The response, exactly as the API sent it. */
  readonly created = input.required<OnboardOrganizationResponse>();

  /**
   * What the practice was called, from the draft.
   *
   * Taken from the form rather than from the response, because the response does
   * not carry it - and re-fetching a practice to print its own name back at the
   * person who just typed it would be a request made to avoid an input.
   */
  readonly practiceName = input<string>('');

  readonly another = output<void>();
}

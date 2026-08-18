import { Component } from '@angular/core';
import { Placeholder, TranslatePipe } from 'ui';

/**
 * The places this practice works from, and how to reach each one. The ticket that
 * fills it is filed against "branches", which is the API's noun; the URL and the
 * screen say clinics, which is the word a practice manager has.
 *
 * IT IS A PLACEHOLDER, AND T-66 FILLS IT. What T-97 owns is the route and the
 * frame around it; a screen's content is one ticket's work with one owner, because
 * two authors on one component is a merge conflict with opinions.
 *
 * IT IS ITS OWN FILE FOR THE SAME REASON. The four sections shared one component
 * while the console only had to prove its addresses were reachable; they are four
 * files now so that T-66 can fill this one without touching the other three,
 * and so that each arrives in the reader's browser only when they open it.
 *
 * It renders its own name rather than an empty area, so that reaching it by typing
 * the address proves the route resolved - a blank region looks exactly like a screen
 * that failed to load.
 *
 * The strings go through the pipe rather than being resolved in a field: the pipe is
 * impure and reads the language signal, so switching language rewrites the screen
 * with no reload. A field would be resolved once, at construction, and a routed
 * component is not rebuilt when the language changes.
 */
@Component({
  selector: 'app-clinics-section',
  imports: [Placeholder, TranslatePipe],
  templateUrl: './clinics-section.html',
})
export class ClinicsSection {}

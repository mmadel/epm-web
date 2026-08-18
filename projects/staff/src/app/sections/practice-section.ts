import { Component } from '@angular/core';
import { Placeholder, TranslatePipe } from 'ui';

/**
 * The practice's own details, and the console's home.
 *
 * IT IS A PLACEHOLDER, AND T-65 FILLS IT. What this ticket owns is the route and
 * the frame around it; the screen's content is one ticket's work with one owner,
 * because two authors on one component is a merge conflict with opinions.
 *
 * It renders its own name rather than an empty area, so that reaching it by
 * typing the address proves the route resolved - a blank region looks exactly
 * like a screen that failed to load.
 *
 * The strings go through the pipe rather than being resolved in a field: the
 * pipe is impure and reads the language signal, so switching language rewrites
 * the screen with no reload. A field would be resolved once, at construction, and
 * a routed component is not rebuilt when the language changes.
 */
@Component({
  selector: 'app-practice-section',
  imports: [Placeholder, TranslatePipe],
  templateUrl: './practice-section.html',
})
export class PracticeSection {}

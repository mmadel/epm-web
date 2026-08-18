import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The product mark in the header: what the product is, which console of it this
 * is, and the way back to that console's home.
 *
 * THE CONSOLE'S NAME IS THE POINT OF IT. A person can hold an account in the
 * staff console and in the platform console, the two run under opposite tenancy
 * rules, and there is nothing else on a screen that says which one is open. So
 * the name is not decoration next to the product's: it sits on `--epm-accent`,
 * the one token whose job is to differ per application, and the two consoles are
 * told apart by shape and colour before anyone reads a word.
 *
 * IT IS ALSO THE LINK HOME, which is why `link` is required rather than
 * optional. A wordmark that is not a link is the one affordance every web
 * application has that this one would be missing, and a person who has followed
 * a link into a screen they did not want has nothing else in the header to press.
 *
 * NO TRANSLATION HAPPENS HERE, for the reason given on {@link Shell}: both
 * strings arrive resolved, so mounting a frame never reads the language service.
 */
@Component({
  selector: 'lib-wordmark',
  imports: [RouterLink],
  templateUrl: './wordmark.html',
  styleUrl: './wordmark.scss',
})
export class Wordmark {
  /** The product's name, already in the language the host wants. */
  readonly product = input.required<string>();

  /**
   * Which console this is - "Staff", "Platform" - already in the language the
   * host wants.
   *
   * Not `console`, which would shadow the global of that name inside this class
   * for the sake of a shorter input.
   */
  readonly consoleName = input.required<string>();

  /** Where the mark navigates: this console's home. */
  readonly link = input.required<string>();
}

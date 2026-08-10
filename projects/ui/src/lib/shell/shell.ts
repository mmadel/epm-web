import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** One entry in the shell's navigation. */
export interface ShellNavigationItem {
  /** The text on the entry, already in the language the host wants. */
  readonly label: string;
  /** Router path the entry navigates to, e.g. `/patients`. */
  readonly link: string;
}

/**
 * A product's navigation: the landmark's accessible name and its entries.
 *
 * The label and the entries are one input rather than two because a navigation
 * landmark with no accessible name is an unlabelled landmark, and two separate
 * inputs let a host supply the entries and forget the name.
 */
export interface ShellNavigation {
  /** Accessible name of the `nav` landmark, e.g. "Main navigation". */
  readonly label: string;
  /** The entries, in the order they are shown. May be empty. */
  readonly items: readonly ShellNavigationItem[];
}

/**
 * The application frame: an optional edge strip, a header, an optional
 * navigation column, and the content area.
 *
 * It lives in `ui` and knows nothing about any one application. The staff
 * console, the patient app and the platform console are three different
 * products, so everything that differs between them arrives from outside: the
 * header's two ends are projected, the navigation is an input, and the content
 * is projected. The shell renders a frame and never learns what is inside it.
 *
 * NO TRANSLATION HAPPENS HERE, and that is a requirement rather than a
 * simplification. Resolving a key inside the frame would make the frame inject
 * `TranslationService`, which injects `LanguageService`, so mounting it would
 * read the active language. The platform console is English-only and LTR-only
 * and is required not to read the language service at all (F1 P-03.2). Labels
 * are therefore resolved strings: staff pipes them through `translate`, the
 * platform console writes them in English, and neither arrangement is imposed
 * on the other.
 *
 * DIRECTION. The navigation is on the START side, which is the left in English
 * and the right in Arabic, and there is not one direction-specific declaration
 * in the stylesheet to make that happen. The frame is a grid whose template
 * places `nav` before `main` on the inline axis, and a grid's inline axis
 * follows the document's direction, so the mirroring is the browser's job
 * rather than a second stylesheet's. See shell.scss.
 *
 * SLOTS. `[shell-edge]` sits above the header, for a strip a product uses to
 * mark something about the whole page - the platform console puts its
 * environment edge there. `[shell-brand]` and `[shell-header-end]` are the two
 * ends of the header. Everything else is projected into the content region.
 */
@Component({
  selector: 'lib-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  /**
   * The skip link's text.
   *
   * Required, with no English default: a default would be the one string in the
   * frame that silently stays English in Arabic, and it is the first thing a
   * keyboard user hears.
   */
  readonly skipLinkLabel = input.required<string>();

  /**
   * This product's navigation, or `undefined` when it has none.
   *
   * The two are different states and are modelled as different values.
   * `undefined` means "this product has no navigation", and no `nav` landmark
   * is rendered at all - the platform console has one job and no navigation
   * band, and a landmark that announces itself and contains nothing is worse
   * than no landmark. An empty `items` array means "there is a navigation,
   * it has no entries yet", which renders the named landmark, empty.
   */
  readonly navigation = input<ShellNavigation | undefined>(undefined);
}

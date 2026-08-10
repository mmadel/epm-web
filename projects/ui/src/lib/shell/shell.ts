import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { isLanguage, Language, LANGUAGES, LanguageService } from 'core';

import { TranslatePipe } from '../i18n/translate-pipe';

/**
 * One entry in the shell's navigation.
 *
 * The label is a translation KEY rather than a string: the shell resolves it in the
 * active language, so a host cannot accidentally hand it English text that then fails
 * to change when the language does.
 */
export interface ShellNavigationItem {
  /** Translation key for the label, e.g. `shell.nav.patients`. */
  readonly labelKey: string;
  /** Router path the entry navigates to, e.g. `/patients`. */
  readonly link: string;
}

/** Which translation key names each language. A `Record` so a new language is a compile error here. */
const LANGUAGE_LABEL_KEYS: Readonly<Record<Language, string>> = {
  en: 'shell.language.english',
  ar: 'shell.language.arabic',
};

/**
 * The application frame: header, navigation, content area.
 *
 * It lives in `ui` and knows nothing about any one application. The staff console and
 * the patient app are different products with different navigation, so the entries are
 * an input and the content is projected - the shell renders a frame and never learns
 * what is inside it.
 *
 * DIRECTION. The navigation is on the START side, which is the left in English and the
 * right in Arabic, and there is not one direction-specific declaration in the
 * stylesheet to make that happen. The frame is a grid whose template places `nav`
 * before `main` on the inline axis, and a grid's inline axis follows the document's
 * direction, so the mirroring is the browser's job rather than a second stylesheet's.
 * See shell.scss.
 *
 * LANGUAGE. The switch writes through `LanguageService`, which is the only owner of the
 * language in the workspace. It deliberately does not touch `dir` or `lang` itself:
 * those are written by one effect inside that service, and a second writer is how a
 * product ends up right-to-left with English text.
 */
@Component({
  selector: 'lib-shell',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  /**
   * The navigation entries, in the order they are shown.
   *
   * Empty by default, which renders a frame with no navigation rather than a broken
   * one - the patient app will mount this long before it knows its own navigation.
   */
  readonly navigation = input<readonly ShellNavigationItem[]>([]);

  private readonly languageService = inject(LanguageService);

  /** The active language, for the switch's selected option. */
  protected readonly language = this.languageService.language;

  /** The languages on offer, derived from `core`'s list so the switch cannot go stale. */
  protected readonly languageOptions = LANGUAGES.map((value) => ({
    value,
    labelKey: LANGUAGE_LABEL_KEYS[value],
  }));

  /**
   * Applies a choice from the language switch.
   *
   * The value is narrowed rather than cast: the only values the `<select>` offers are
   * languages, but a cast would make that an assumption instead of a check, and the
   * check costs one function call.
   */
  protected onLanguageChange(event: Event): void {
    const chosen = (event.target as HTMLSelectElement).value;

    if (isLanguage(chosen)) {
      this.languageService.setLanguage(chosen);
    }
  }
}

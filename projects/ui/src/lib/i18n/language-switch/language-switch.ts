import { Component, inject } from '@angular/core';
import { isLanguage, Language, LANGUAGES, LanguageService } from 'core';

import { TranslatePipe } from '../translate-pipe';

/** Which translation key names each language. A `Record` so a new language is a compile error here. */
const LANGUAGE_LABEL_KEYS: Readonly<Record<Language, string>> = {
  en: 'shell.language.english',
  ar: 'shell.language.arabic',
};

/**
 * The control that switches the product's language.
 *
 * It is its own component rather than part of the shell because mounting it is
 * a decision, not a consequence of having a frame. It reads the language
 * service, and a bilingual product wants that while an English-only one -
 * the platform console, F1 P-03.2 - is required not to. Keeping it inside the
 * shell would mean every application that renders a frame reads the language,
 * whether or not it offers a way to change it.
 *
 * The switch writes through `LanguageService`, which is the only owner of the
 * language in the workspace. It deliberately does not touch `dir` or `lang`
 * itself: those are written by one effect inside that service, and a second
 * writer is how a product ends up right-to-left with English text.
 */
@Component({
  selector: 'lib-language-switch',
  imports: [TranslatePipe],
  templateUrl: './language-switch.html',
  styleUrl: './language-switch.scss',
})
export class LanguageSwitch {
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

import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LanguageSwitch,
  Shell,
  ShellNavigation,
  TranslatePipe,
  TranslationService,
  Wordmark,
} from 'ui';

import { ROUTE_PATHS } from './route-paths';

/**
 * What this console's navigation offers, as keys. Resolved in {@link App.navigation}.
 *
 * THE ORDER IS CONTAINMENT, not alphabet and not frequency: a practice has clinics,
 * clinics have staff, and all of it sits under one subscription. It is the order the
 * ticket specifies and the order the four tabs are read in.
 *
 * The label key is the SECTION'S key, the same one the route hands its screen. A tab
 * and the heading it opens are one name, so they are one string; two keys would be
 * two names the moment somebody reworded one of them.
 *
 * EVERY ENTRY IS VISIBLE TO EVERY SIGNED-IN CALLER, and that is deliberate. Hiding
 * one by role needs the session, which is T-81 in M2; reading roles from anywhere
 * else in the meantime would be a second source of truth for who may do what.
 */
const NAVIGATION = [
  { labelKey: 'shell.section.practice', link: ROUTE_PATHS.practice },
  { labelKey: 'shell.section.clinics', link: ROUTE_PATHS.clinics },
  { labelKey: 'shell.section.staff', link: ROUTE_PATHS.staff },
  { labelKey: 'shell.section.subscription', link: ROUTE_PATHS.subscription },
] as const;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Shell, Wordmark, LanguageSwitch, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly translations = inject(TranslationService);

  /** Where the wordmark goes, which is where `/` goes: this console's home. */
  protected readonly home = ROUTE_PATHS.practice;

  /**
   * This console's navigation, resolved in the active language.
   *
   * It lives here rather than in the shell because the shell is shared with the
   * patient app and the platform console, which are different products with
   * different navigation - and, in the platform console's case, none.
   *
   * The labels are resolved here rather than by the shell because the shell
   * translates nothing: resolving a key inside the frame would make every
   * application that mounts a frame read the language service. A `computed`
   * over `TranslationService.translate`, which reads the language signal, so
   * the entries re-resolve when the language changes.
   */
  protected readonly navigation = computed<ShellNavigation>(() => ({
    label: this.translations.translate('shell.nav.label'),
    items: NAVIGATION.map((entry) => ({
      label: this.translations.translate(entry.labelKey),
      link: entry.link,
    })),
  }));
}

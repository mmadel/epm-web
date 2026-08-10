import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitch, Shell, ShellNavigation, TranslatePipe, TranslationService } from 'ui';

import { routes } from './app.routes';

/** What this console's navigation offers, as keys. Resolved in {@link App.navigation}. */
const NAVIGATION = [
  { labelKey: 'shell.nav.dashboard', link: '/dashboard' },
  { labelKey: 'shell.nav.patients', link: '/patients' },
  { labelKey: 'shell.nav.appointments', link: '/appointments' },
  { labelKey: 'shell.nav.billing', link: '/billing' },
] as const;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Shell, LanguageSwitch, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly translations = inject(TranslationService);

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

  /**
   * Whether any screen exists yet. Read from the route table rather than hardcoded,
   * so the empty state in the template disappears by itself the moment the first
   * feature ticket registers a route.
   */
  protected readonly hasScreens = routes.length > 0;
}

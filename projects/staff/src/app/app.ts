import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Shell, ShellNavigationItem, TranslatePipe } from 'ui';

import { routes } from './app.routes';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Shell, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /**
   * What this console's navigation offers.
   *
   * It lives here rather than in the shell because the shell is shared with the
   * patient app, which is a different product with different navigation. The labels
   * are translation keys, so the shell resolves them in the active language.
   */
  protected readonly navigation: readonly ShellNavigationItem[] = [
    { labelKey: 'shell.nav.dashboard', link: '/dashboard' },
    { labelKey: 'shell.nav.patients', link: '/patients' },
    { labelKey: 'shell.nav.appointments', link: '/appointments' },
    { labelKey: 'shell.nav.billing', link: '/billing' },
  ];

  /**
   * Whether any screen exists yet. Read from the route table rather than hardcoded,
   * so the empty state in the template disappears by itself the moment the first
   * feature ticket registers a route.
   */
  protected readonly hasScreens = routes.length > 0;
}

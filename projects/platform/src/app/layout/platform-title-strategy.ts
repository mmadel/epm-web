import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { ENVIRONMENT_NAME } from '../environment/environment-name';
import { environmentPresentation } from './environment-presentation';

/** The product's name, as it appears in the browser tab. */
const PRODUCT = 'EPM Platform';

/**
 * Writes the browser tab: `<page> · EPM Platform · <Environment>`.
 *
 * THE ENVIRONMENT IS IN THE TITLE, not only in the header, because a platform
 * administrator with four tabs open is looking at tab strips, not at headers,
 * and the tab is the last thing between them and creating a practice in the
 * wrong place. Same reason the chip always renders: the environment is never
 * absent from the title, production included.
 *
 * A route with no title of its own gets the product and the environment on
 * their own rather than an empty leading separator.
 */
@Injectable()
export class PlatformTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly environment = environmentPresentation(inject(ENVIRONMENT_NAME)).label;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);

    this.title.setTitle([page, PRODUCT, this.environment].filter(Boolean).join(' · '));
  }
}

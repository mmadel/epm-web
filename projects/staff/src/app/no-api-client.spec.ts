import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

/**
 * The shell calls nothing.
 *
 * T-97 §4: this ticket makes no HTTP request at all. The frame has no data - a
 * header showing the practice's name is the practice section's answer to a call it
 * makes itself, not the frame's own fetch - and a shell that acquired one would be
 * a request every screen in the console pays for on every load.
 *
 * This is the runtime half. The static half - that nothing in `ui` or in this
 * console imports `api-client` at all - is `tools/boundaries/no-api-client.test.js`,
 * which reads the sources; an unused import is invisible from here, and a call made
 * through a service this file never imports is invisible from there.
 */
describe('the shell on load', () => {
  afterEach(() => {
    // Mounting the shell reads the language service, which labels the document.
    // Left behind, the attributes leak into whatever runs next.
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('makes no HTTP request at all', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    // `verify` fails on any request that was opened and not answered, which is
    // every request a frame with no data could possibly make.
    TestBed.inject(HttpTestingController).verify();
  });
});

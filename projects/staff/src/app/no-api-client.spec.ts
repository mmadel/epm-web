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
 * THIS IS THE RUNTIME HALF, AND IT IS THE HALF THAT SURVIVED. The static half used
 * to be a test reading the sources of two folders; T-99 replaced it with the
 * `epm/no-api-client-in-libraries` lint rule, which fails the build for every
 * library in the workspace rather than for the two folders somebody remembered.
 *
 * The two halves were never the same assertion and this one is not superseded: an
 * unused import is invisible from here, and a call made through a service this file
 * never imports is invisible from there. What that rule does not say is that the
 * console opens no request when it starts, which is what this measures.
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

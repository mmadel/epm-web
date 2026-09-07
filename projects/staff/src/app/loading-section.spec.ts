import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideStubAuth } from 'core';

import { App } from './app';

/** Stands in for a section, so the held-up navigation can finish cleanly. */
@Component({ selector: 'app-arrived-section', template: '<p>Arrived</p>' })
class ArrivedSection {}

/**
 * What the console shows while a section's chunk is being fetched.
 *
 * IT IS DRIVEN BY A CHUNK THAT NEVER ARRIVES UNTIL THE TEST SAYS SO. A route whose
 * `loadComponent` returns a promise the test holds is the only way to stop the
 * console in the state worth asserting: with a real section the chunk resolves inside
 * the same task, the placeholder never paints, and a spec that navigated to one would
 * be asserting the end of the navigation rather than the middle of it.
 *
 * `whenStable` IS NO USE HERE, and that is the point rather than an inconvenience.
 * It waits for exactly the thing being held open, so the fixture is driven by hand
 * while the navigation is in flight and only awaited once it has finished.
 *
 * THE FRAME HAS TO SURVIVE IT. Replacing the whole page while a lazy chunk loads
 * makes a route change look like a reload, and the header is the one thing on the
 * screen that says which console this is - T-97 §5, "the shell never blanks while a
 * section loads".
 */
describe('the console while a section is being fetched', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;

  /**
   * The chunk, and the switch that lets it arrive.
   *
   * Both are made in `beforeEach` rather than inside `loadComponent`, because the
   * router does not call that factory until it has already started navigating - and
   * the placeholder is on the screen before then, which is the whole state under
   * test.
   */
  let chunk: Promise<typeof ArrivedSection>;
  let deliver: () => void;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    chunk = new Promise<typeof ArrivedSection>((resolve) => {
      deliver = () => resolve(ArrivedSection);
    });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: ArrivedSection },
          { path: 'slow', loadComponent: () => chunk },
        ]),
        // The frame only exists once somebody is signed in, and the frame
        // surviving a lazy chunk is the whole of what this file measures.
        provideStubAuth(),
      ],
    });

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(App);

    await fixture.whenStable();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('shows a placeholder in the content region, inside the frame', async () => {
    // Deliberately not awaited: the assertion is about the navigation while it is
    // still running.
    const navigation = router.navigateByUrl('/slow');

    await Promise.resolve();
    fixture.detectChanges();

    expect(element().querySelector('.placeholder__heading')?.textContent?.trim()).toBe('Loading');

    // The frame is still there, and it is the whole point. The wordmark is also the
    // way out of a screen that never arrives.
    expect(element().querySelector('lib-shell')).not.toBeNull();
    expect(element().querySelector('.wordmark')).not.toBeNull();

    // The outlet is hidden rather than torn down - see app.html. Destroying it
    // mid-navigation leaves the router with nowhere to put the screen it is fetching.
    expect(element().querySelector('.staff-outlet--waiting')).not.toBeNull();
    expect(element().querySelector('router-outlet')).not.toBeNull();

    deliver();
    await navigation;
  });

  it('takes the placeholder away once the section has arrived', async () => {
    const navigation = router.navigateByUrl('/slow');

    await Promise.resolve();
    fixture.detectChanges();

    deliver();
    await navigation;
    await fixture.whenStable();

    // A placeholder left on the screen after the wait is over is worse than none: it
    // says the console is still working when it has finished.
    expect(element().querySelector('.placeholder__heading')).toBeNull();
    expect(element().querySelector('.staff-outlet--waiting')).toBeNull();
    expect(element().querySelector('app-arrived-section')).not.toBeNull();
  });
});

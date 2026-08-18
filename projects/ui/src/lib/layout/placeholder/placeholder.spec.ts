import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Placeholder } from './placeholder';

/**
 * A host, because the thing worth asserting beyond the two strings is that what a
 * caller projects lands after them - which is how the unmatched-address screen
 * gets a way out without a second component.
 */
@Component({
  selector: 'lib-placeholder-spec-host',
  imports: [Placeholder],
  template: `
    <lib-placeholder heading="Practice details" body="Not built yet">
      <a class="way-out" href="/practice">Go to practice details</a>
    </lib-placeholder>
  `,
})
class PlaceholderSpecHost {}

describe('Placeholder', () => {
  let fixture: ComponentFixture<PlaceholderSpecHost>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(PlaceholderSpecHost);
    await fixture.whenStable();
  });

  it('names the screen and says why there is nothing on it', () => {
    expect(element().querySelector('.placeholder__heading')?.textContent?.trim()).toBe(
      'Practice details',
    );
    expect(element().querySelector('.placeholder__body')?.textContent?.trim()).toBe(
      'Not built yet',
    );
  });

  it('makes the screen name the first-level heading', () => {
    // The frame around it declares no heading of its own - the wordmark is a link
    // and the navigation is a landmark - so an `h2` here would leave every unbuilt
    // screen with nothing for a screen reader to jump to.
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Practice details');
  });

  it('renders what the caller projects after the sentence', () => {
    // Order is the assertion, not merely presence. A way out rendered above the
    // explanation of why it is needed is a link with no reason attached to it.
    const projected = element().querySelector('.way-out');

    expect(projected).not.toBeNull();
    expect(element().querySelector('.placeholder__body')?.nextElementSibling).toBe(projected);
  });
});

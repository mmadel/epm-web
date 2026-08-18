import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageHeader } from './page-header';

/**
 * A host, because three of the four states are about what a caller did or did not
 * pass, and the fourth is about what it projected. A component created directly can
 * be given inputs but not content.
 */
@Component({
  selector: 'lib-page-header-spec-host',
  imports: [PageHeader],
  template: `
    <lib-page-header [title]="title()" [supporting]="supporting()">
      @if (withAction()) {
        <button action type="button" class="action">Add a clinic</button>
      }
    </lib-page-header>
  `,
})
class PageHeaderSpecHost {
  readonly title = signal('Clinics');
  readonly supporting = signal('');
  readonly withAction = signal(false);
}

describe('PageHeader', () => {
  let fixture: ComponentFixture<PageHeaderSpecHost>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function render(state: Partial<{ supporting: string; withAction: boolean }> = {}) {
    fixture.componentInstance.supporting.set(state.supporting ?? '');
    fixture.componentInstance.withAction.set(state.withAction ?? false);
    await fixture.whenStable();

    return element();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(PageHeaderSpecHost);
    await fixture.whenStable();
  });

  it('renders the title as the screen’s one first-level heading', async () => {
    const host = await render();
    const headings = host.querySelectorAll('h1');

    // One `h1` per screen, and this is it. A header that rendered two would leave
    // every screen in the console with an ambiguous outline.
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent?.trim()).toBe('Clinics');
  });

  it('renders no supporting element at all when there is nothing to say', async () => {
    const host = await render();

    // Not an empty paragraph. An element with no text in it still takes its margin,
    // which moves the title off the baseline it sits on everywhere else.
    expect(host.querySelector('.page-header__supporting')).toBeNull();
  });

  it('renders the supporting line when it is given one', async () => {
    const host = await render({ supporting: 'Three clinics across two cities.' });

    expect(host.querySelector('.page-header__supporting')?.textContent?.trim()).toBe(
      'Three clinics across two cities.',
    );
  });

  it('puts a projected action after the text, which is the inline end', async () => {
    const host = await render({ withAction: true });
    const row = host.querySelector('.page-header');

    expect(row?.querySelector('.action')).not.toBeNull();

    // ORDER IS THE ASSERTION. The action is at the inline end because it comes
    // second in a row whose inline axis follows the document direction - so this is
    // also what makes it correct in Arabic, and there is no second stylesheet to
    // check for.
    expect(row?.lastElementChild?.classList.contains('action')).toBe(true);
  });

  it('leaves no empty action container when a screen has no action', async () => {
    const host = await render();
    const row = host.querySelector('.page-header');

    // CRITERION 4, AND THE ONE A GREEN SUITE HIDES. A wrapper around the slot is in
    // the DOM whether or not anything lands in it, renders identically in the state
    // that does have an action, and takes the gap beside the title in the three
    // states that do not.
    expect(row?.children).toHaveLength(1);
    expect(row?.lastElementChild?.classList.contains('page-header__text')).toBe(true);
  });

  it('keeps the same order under `dir="rtl"`, because the browser mirrors the row', async () => {
    // The component reorders nothing and names no side: the row is flex, its inline
    // axis follows the document's direction, and Arabic is the browser's work rather
    // than a mirrored stylesheet's. What holds the stylesheet to that is Stylelint,
    // which fails the build on a physical property.
    const host = await render({ withAction: true });

    host.setAttribute('dir', 'rtl');
    await fixture.whenStable();

    const row = host.querySelector('.page-header');

    expect(row?.firstElementChild?.classList.contains('page-header__text')).toBe(true);
    expect(row?.lastElementChild?.classList.contains('action')).toBe(true);
  });

  it('makes the heading focusable, so a frame can move focus to it', async () => {
    const host = await render();

    // Without it the browser silently refuses to move focus and the frame's work has
    // no effect - which looks exactly like it working.
    expect(host.querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
  });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Shell, ShellNavigation } from './shell';

/**
 * A host, rather than creating the shell directly, because most of what is worth
 * asserting about a frame only exists when something is mounted inside one: that
 * the projected content lands in the content region, that the two ends of the
 * header carry what they were given, and that the shell renders entries it was
 * given rather than entries it invented.
 */
@Component({
  selector: 'lib-shell-spec-host',
  imports: [Shell],
  template: `
    <lib-shell [skipLinkLabel]="skipLinkLabel()" [navigation]="navigation()">
      <span shell-edge class="edge">Edge</span>
      <span shell-brand class="brand">Brand</span>
      <span shell-header-end class="header-end">Header end</span>
      <p class="projected">Projected content</p>
    </lib-shell>
  `,
})
class ShellSpecHost {
  // Signals, so a test can change what the shell was given and have the change
  // reach it without depending on how the fixture happens to schedule change
  // detection.
  readonly skipLinkLabel = signal('Skip to main content');
  readonly navigation = signal<ShellNavigation | undefined>({
    label: 'Main navigation',
    items: [
      { label: 'Dashboard', link: '/dashboard' },
      { label: 'Patients', link: '/patients' },
    ],
  });
}

describe('Shell', () => {
  let fixture: ComponentFixture<ShellSpecHost>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function query<T extends Element>(selector: string): T | null {
    return element().querySelector<T>(selector);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    fixture = TestBed.createComponent(ShellSpecHost);
    await fixture.whenStable();
  });

  it('renders the skip link label it was given', () => {
    expect(query('.shell-skip-link')?.textContent?.trim()).toBe('Skip to main content');
  });

  it('points the skip link at the main region', () => {
    // A skip link whose target id was renamed still looks fine and does nothing.
    const target = query('.shell-skip-link')?.getAttribute('href');

    expect(target).toBe('#shell-main');
    expect(query(`main${target}`)).not.toBeNull();
  });

  it('labels the navigation landmark from the navigation it was given', () => {
    expect(query('nav')?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('renders one entry per navigation item, with its label and its link', () => {
    const links = [...element().querySelectorAll<HTMLAnchorElement>('.shell-nav__link')];

    expect(links.map((link) => link.textContent?.trim())).toEqual(['Dashboard', 'Patients']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/patients']);
  });

  it('renders a named but empty landmark for a navigation with no entries', async () => {
    fixture.componentInstance.navigation.set({ label: 'Main navigation', items: [] });
    await fixture.whenStable();

    expect(element().querySelectorAll('.shell-nav__link')).toHaveLength(0);
    // The landmark itself stays: a navigation whose entries have not been built
    // yet is still a navigation, which is the state the patient app will mount
    // this in.
    expect(query('nav')).not.toBeNull();
  });

  it('renders no navigation landmark at all for a product that has none', async () => {
    // Not the same state as an empty entry list, and not the same markup. The
    // platform console has no navigation, and a landmark that announces itself
    // and then contains nothing is worse for a screen reader than no landmark.
    fixture.componentInstance.navigation.set(undefined);
    await fixture.whenStable();

    expect(query('nav')).toBeNull();
  });

  it('projects the brand into the start of the header', () => {
    expect(query('.shell-header .shell-header__start .brand')?.textContent).toBe('Brand');
  });

  it('projects header-end content into the end of the header', () => {
    expect(query('.shell-header .shell-header__end .header-end')?.textContent).toBe('Header end');
  });

  it('projects the edge strip above the header', () => {
    const children = [...element().querySelectorAll('lib-shell > *')];

    expect(query('.shell-edge .edge')?.textContent).toBe('Edge');
    // Above, not merely present: the edge is how the platform console marks a
    // dangerous environment, and an edge rendered under the header is a mark
    // nobody sees first.
    expect(children.indexOf(query('.shell-edge')!)).toBeLessThan(
      children.indexOf(query('.shell-header')!),
    );
  });

  it('projects content into the main region', () => {
    expect(query('main.shell-main .projected')?.textContent).toBe('Projected content');
  });

  it('renders no language control of its own', () => {
    // The frame resolves no language and offers no way to change one. A switch
    // reintroduced here would make every application that mounts a frame read
    // the language service, including the one that is required not to.
    expect(query('select')).toBeNull();
  });

  it('writes no direction of its own onto any element it renders', () => {
    // Direction is a document-level fact owned by `core`. Anything inside the
    // shell carrying its own `dir` is a second source of truth, and the one that
    // will be forgotten when the other changes.
    expect(element().querySelectorAll('[dir]')).toHaveLength(0);
  });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Shell, ShellNavigation } from './shell';

/**
 * The navigation's active state, which is the one thing about the frame that is
 * behaviour rather than layout.
 *
 * IT IS DERIVED FROM THE ROUTER AND FROM NOTHING ELSE (T-97 §5). No component
 * holds a copy of "which section am I in", so these navigate rather than setting
 * an input: what is asserted is what the router did, not what a host told the
 * frame to draw.
 */
@Component({
  selector: 'lib-shell-nav-spec-host',
  imports: [Shell],
  template: `
    <lib-shell skipLinkLabel="Skip to main content" [navigation]="navigation()">
      <p>Content</p>
    </lib-shell>
  `,
})
class ShellNavSpecHost {
  readonly navigation = signal<ShellNavigation>({
    label: 'Main navigation',
    items: [
      { label: 'Practice details', link: '/practice' },
      { label: 'Clinics', link: '/clinics' },
      { label: 'Staff', link: '/staff' },
      { label: 'Subscription', link: '/subscription' },
    ],
  });
}

/** The four addresses the entries point at, each resolving to something. */
const ROUTES = ['practice', 'clinics', 'staff', 'subscription'].map((path) => ({
  path,
  children: [],
}));

async function open(url: string): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });

  await TestBed.inject(Router).navigateByUrl(url);

  const fixture: ComponentFixture<ShellNavSpecHost> = TestBed.createComponent(ShellNavSpecHost);

  await fixture.whenStable();

  return fixture.nativeElement as HTMLElement;
}

function labels(element: HTMLElement, selector: string): string[] {
  return [...element.querySelectorAll(selector)].map((link) => link.textContent?.trim() ?? '');
}

describe('the shell navigation', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('renders the entries in the order it was given', async () => {
    // The order is containment - a practice has clinics, clinics have staff, all of
    // it under one subscription - and it is the host's to decide. The frame's job is
    // not to sort them.
    expect(labels(await open('/practice'), '.shell-nav__link')).toEqual([
      'Practice details',
      'Clinics',
      'Staff',
      'Subscription',
    ]);
  });

  it('marks exactly one entry active, whichever address is open', async () => {
    const expected = {
      '/practice': 'Practice details',
      '/clinics': 'Clinics',
      '/staff': 'Staff',
      '/subscription': 'Subscription',
    };

    for (const [url, label] of Object.entries(expected)) {
      // The whole list, not a count and not the one entry. Two marked entries and no
      // marked entry are the same bug - the frame has stopped saying where you are -
      // and comparing the list catches both, and names what was marked instead.
      expect(labels(await open(url), '.shell-nav__link--active'), `at ${url}`).toEqual([label]);
    }
  });

  it('marks no entry active for an address none of them points at', async () => {
    // The unknown-route screen renders inside the frame, so the navigation is still
    // on it. Marking an entry there would say the reader is somewhere they are not.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([...ROUTES, { path: '**', children: [] }])],
    });
    await TestBed.inject(Router).navigateByUrl('/nonsense');

    const fixture = TestBed.createComponent(ShellNavSpecHost);
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.shell-nav__link--active'),
    ).toHaveLength(0);
  });

  it('distinguishes the active entry by more than colour', async () => {
    const element = await open('/clinics');
    const [active, resting] = [
      element.querySelector<HTMLElement>('.shell-nav__link--active'),
      element.querySelector<HTMLElement>('.shell-nav__link:not(.shell-nav__link--active)'),
    ];

    // COLOUR ALONE FAILS FOR A COLOUR-BLIND READER, so the weight has to move too.
    // Read from the rendered result rather than from the stylesheet: a rule that
    // exists and is out-specified by another one reads as present in a diff and does
    // nothing on the screen.
    expect(active).not.toBeNull();
    expect(resting).not.toBeNull();
    expect(getComputedStyle(active!).fontWeight).not.toBe(getComputedStyle(resting!).fontWeight);
  });

  it('announces the active entry to a screen reader', async () => {
    const element = await open('/staff');
    const current = [...element.querySelectorAll('.shell-nav__link')].filter(
      (link) => link.getAttribute('aria-current') === 'page',
    );

    // The weight and the mark are what a sighted reader sees; `aria-current` is the
    // same fact for a reader who cannot see either, and it is one entry for the same
    // reason.
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent?.trim()).toBe('Staff');
  });
});

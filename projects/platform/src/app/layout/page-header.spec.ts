import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { PageHeader } from './page-header';

@Component({
  selector: 'app-list-page',
  imports: [PageHeader],
  template: `
    <app-page-header subtitle="Every practice on the platform.">
      <button type="button" class="action">Add a practice</button>
    </app-page-header>
  `,
})
class ListPage {}

@Component({
  selector: 'app-inner-page',
  imports: [PageHeader],
  template: '<app-page-header [back]="true" />',
})
class InnerPage {}

@Component({
  selector: 'app-page-header-spec-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class PageHeaderSpecHost {}

async function open(url: string): Promise<ComponentFixture<PageHeaderSpecHost>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', title: 'Practices', component: ListPage },
        { path: 'add', title: 'Add a practice', component: InnerPage },
        { path: 'untitled', component: ListPage },
      ]),
    ],
  });

  const fixture = TestBed.createComponent(PageHeaderSpecHost);
  await TestBed.inject(Router).navigateByUrl(url);
  await fixture.whenStable();

  return fixture;
}

function element(fixture: ComponentFixture<PageHeaderSpecHost>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('PageHeader', () => {
  it('takes its heading from the route, so the tab and the page cannot disagree', async () => {
    const fixture = await open('/');

    const headings = element(fixture).querySelectorAll('h1');

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Practices');
  });

  it('reads the new route title after a navigation', async () => {
    const fixture = await open('/');

    await TestBed.inject(Router).navigateByUrl('/add');
    await fixture.whenStable();

    expect(element(fixture).querySelector('h1')?.textContent).toBe('Add a practice');
  });

  it('renders an empty heading for a route with no title', async () => {
    const fixture = await open('/untitled');

    // Not a placeholder and not the product name: a page whose route forgot its
    // title should look wrong, because it is.
    expect(element(fixture).querySelector('h1')?.textContent).toBe('');
  });

  it('makes the heading focusable, because the frame focuses it', async () => {
    const fixture = await open('/');

    // Without this the browser silently refuses to move focus and the frame's
    // work has no effect - which looks exactly like it working.
    expect(element(fixture).querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
  });

  it('renders the subtitle it was given', async () => {
    const fixture = await open('/');

    expect(element(fixture).querySelector('.page-header__subtitle')?.textContent?.trim()).toBe(
      'Every practice on the platform.',
    );
  });

  it('renders no subtitle line when there is nothing to say', async () => {
    const fixture = await open('/add');

    expect(element(fixture).querySelector('.page-header__subtitle')).toBeNull();
  });

  it('projects the screen’s one action', async () => {
    const fixture = await open('/');

    expect(element(fixture).querySelector('.page-header__action .action')).not.toBeNull();
  });

  it('offers the way back on a screen that is not the list', async () => {
    const fixture = await open('/add');
    const back = element(fixture).querySelector<HTMLAnchorElement>('.page-header__back');

    // This is what replaces the tab bar that was rejected in review.
    expect(back?.getAttribute('href')).toBe('/practices');
    expect(back?.textContent).toContain('Practices');
  });

  it('offers no way back from the list to itself', async () => {
    const fixture = await open('/');

    expect(element(fixture).querySelector('.page-header__back')).toBeNull();
  });
});

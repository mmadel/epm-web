import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { PageHeader } from './page-header';

@Component({
  selector: 'app-list-page',
  imports: [PageHeader],
  template: `
    <app-page-header subtitle="Every location this practice operates from.">
      <button type="button" class="action">Add a branch</button>
    </app-page-header>
  `,
})
class ListPage {}

@Component({
  selector: 'app-inner-page',
  imports: [PageHeader],
  template: '<app-page-header />',
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
        { path: '', title: 'Branches', component: ListPage },
        { path: 'staff', title: 'Staff', component: InnerPage },
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
    expect(headings[0].textContent).toBe('Branches');
  });

  it('reads the new route title after a navigation', async () => {
    const fixture = await open('/');

    await TestBed.inject(Router).navigateByUrl('/staff');
    await fixture.whenStable();

    expect(element(fixture).querySelector('h1')?.textContent).toBe('Staff');
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
      'Every location this practice operates from.',
    );
  });

  it('renders no subtitle line when there is nothing to say', async () => {
    const fixture = await open('/staff');

    expect(element(fixture).querySelector('.page-header__subtitle')).toBeNull();
  });

  it('projects the screen’s one action', async () => {
    const fixture = await open('/');

    expect(element(fixture).querySelector('.page-header__action .action')).not.toBeNull();
  });

  it('offers no way back, because the stage tabs are the way between screens', async () => {
    const fixture = await open('/staff');

    // There used to be a back link here, reading `Practices`, standing in for the
    // tab bar that had been rejected. There is a tab strip in the frame now, and a
    // second quieter answer to "how do I get to another stage" is worse than none.
    expect(element(fixture).querySelector('.page-header__back')).toBeNull();
  });
});

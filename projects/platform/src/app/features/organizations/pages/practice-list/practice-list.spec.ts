import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';

import { routes } from '../../organizations.routes';

@Component({
  selector: 'app-practice-list-spec-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class PracticeListSpecHost {}

async function render(): Promise<ComponentFixture<PracticeListSpecHost>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });

  const fixture = TestBed.createComponent(PracticeListSpecHost);
  await TestBed.inject(Router).navigateByUrl('/');
  await fixture.whenStable();

  return fixture;
}

function element(fixture: ComponentFixture<PracticeListSpecHost>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('PracticeList', () => {
  it('renders the empty state unconditionally', async () => {
    const fixture = await render();

    // Nothing was configured, nothing was stubbed and nothing was fetched.
    // There is no list route (MILESTONE-F1-PLATFORM.md §5), so there is no
    // count to branch on - and writing a `hasItems` check against a mock would
    // mean transcribing a proposed response shape into the client, which is how
    // a proposal becomes a contract before anyone signs it off.
    expect(element(fixture).querySelector('.empty-state')).not.toBeNull();
    expect(element(fixture).querySelector('.empty-state__headline')?.textContent).toBe(
      'No practices yet',
    );
  });

  it('says what adding a practice actually does', async () => {
    const fixture = await render();

    expect(element(fixture).querySelector('.empty-state__body')?.textContent?.trim()).toBe(
      'Adding a practice creates it along with its branches and its staff, in one step.',
    );
  });

  it('names the ticket that is blocking the list', async () => {
    const fixture = await render();

    // This is the only screen in the console and somebody will demo it. A line
    // naming the ticket is cheaper than the conversation about the missing
    // table, and it is deleted by the first line of P-04.
    expect(element(fixture).querySelector('.empty-state__note')?.textContent?.trim()).toBe(
      'P-04 blocked · list route not agreed',
    );
  });

  it('offers the action in the page header and in the empty state, both going to P-05', async () => {
    const fixture = await render();
    const buttons = [...element(fixture).querySelectorAll<HTMLAnchorElement>('.add-practice')];

    expect(buttons.map((button) => button.getAttribute('href'))).toEqual([
      '/practices/add',
      '/practices/add',
    ]);
    // Only the one in the empty state is the larger size.
    expect(buttons.map((button) => button.classList.contains('add-practice--large'))).toEqual([
      false,
      true,
    ]);
  });

  it('renders one heading, from the route', async () => {
    const fixture = await render();

    expect([...element(fixture).querySelectorAll('h1')].map((h) => h.textContent)).toEqual([
      'Practices',
    ]);
  });

  it('counts nothing and shows no practice data', async () => {
    const fixture = await render();

    // There is no list route, so there is nothing here derived from a practice
    // - and therefore nothing that could be derived from patient data. The
    // absence is the assertion.
    expect(element(fixture).querySelector('table')).toBeNull();
    expect(element(fixture).querySelectorAll('[class*="practice-row"]')).toHaveLength(0);
  });
});

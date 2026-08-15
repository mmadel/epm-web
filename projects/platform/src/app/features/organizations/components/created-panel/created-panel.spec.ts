import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardOrganizationResponse } from 'api-client';

import { CreatedPanel } from './created-panel';

const CREATED: OnboardOrganizationResponse = {
  organizationId: 'org-1',
  subscriptionId: 'sub-1',
  clinics: [
    { id: 'clinic-1', name: 'Maadi' },
    { id: 'clinic-2', name: 'Nasr City' },
  ],
  staff: [{ id: 'staff-1', email: 'hassan@nilecare.eg' }],
};

/**
 * A clipboard that records what it was given, or refuses.
 *
 * `navigator.clipboard` does not exist in the test environment, and it does not
 * exist on an insecure origin either - which is the same failure the component has
 * to survive, so the refusing variant here is not a hypothetical.
 */
function stubClipboard(behaviour: 'writes' | 'refuses'): string[] {
  const written: string[] = [];

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        if (behaviour === 'refuses') {
          return Promise.reject(new Error('denied'));
        }
        written.push(text);
        return Promise.resolve();
      },
    },
  });

  return written;
}

function render(response = CREATED, practiceName = 'Cairo Physio'): ComponentFixture<CreatedPanel> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  const fixture = TestBed.createComponent(CreatedPanel);

  fixture.componentRef.setInput('created', response);
  fixture.componentRef.setInput('practiceName', practiceName);
  fixture.detectChanges();

  return fixture;
}

function element(fixture: ComponentFixture<CreatedPanel>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function copyButtons(fixture: ComponentFixture<CreatedPanel>): HTMLButtonElement[] {
  return [...element(fixture).querySelectorAll<HTMLButtonElement>('.created__copy')];
}

/** Presses a copy button and lets the clipboard promise and the render settle. */
async function press(
  fixture: ComponentFixture<CreatedPanel>,
  button: HTMLButtonElement,
): Promise<void> {
  button.click();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CreatedPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('names the practice and says it was created', () => {
    const fixture = render();

    expect(element(fixture).querySelector('.created__heading')?.textContent).toContain(
      'Cairo Physio was created',
    );
  });

  it('falls back to "The practice" when the draft carried no name', () => {
    const fixture = render(CREATED, '');

    expect(element(fixture).querySelector('.created__heading')?.textContent).toContain(
      'The practice was created',
    );
  });

  it('shows every id the server issued', () => {
    const shown = element(render()).textContent ?? '';

    for (const id of ['org-1', 'sub-1', 'clinic-1', 'clinic-2', 'staff-1']) {
      expect(shown).toContain(id);
    }
  });

  it('counts what was made, on the label of the list that says it', () => {
    const sections = [...element(render()).querySelectorAll('.created__section')];

    expect(sections.map((section) => section.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Branches 2',
      'Staff 1',
    ]);
  });

  it('renders no branch or staff section when there are none', () => {
    const fixture = render({ organizationId: 'org-1', subscriptionId: 'sub-1' });

    expect(element(fixture).querySelectorAll('.created__section')).toHaveLength(0);
    // The two top-level rows are still there: a practice always has both.
    expect(copyButtons(fixture)).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Copying
  // ---------------------------------------------------------------------------

  it('offers one copy control per id', () => {
    // Practice, subscription, two branches, one staff member.
    expect(copyButtons(render())).toHaveLength(5);
  });

  it('copies the id of the row it was pressed on', async () => {
    const written = stubClipboard('writes');
    const fixture = render();

    await press(fixture, copyButtons(fixture)[3]);

    expect(written).toEqual(['clinic-2']);
  });

  it('confirms on the row that was copied, and only that row', async () => {
    stubClipboard('writes');
    const fixture = render();

    await press(fixture, copyButtons(fixture)[0]);

    const labels = copyButtons(fixture).map((button) => button.textContent?.trim());

    expect(labels).toEqual(['Copied', 'Copy', 'Copy', 'Copy', 'Copy']);
  });

  it('keeps the button name fixed while the visible word changes', async () => {
    stubClipboard('writes');
    const fixture = render();
    const [practice] = copyButtons(fixture);

    await press(fixture, practice);

    // A control renamed to "Copied" no longer says what pressing it does, and a
    // screen reader user meets that name before they ever press it.
    expect(practice.getAttribute('aria-label')).toBe('Copy the practice id');
    expect(practice.textContent?.trim()).toBe('Copied');
  });

  it('names what each row copies, so the controls are told apart out of context', () => {
    const named = copyButtons(render()).map((button) => button.getAttribute('aria-label'));

    expect(named).toEqual([
      'Copy the practice id',
      'Copy the subscription id',
      'Copy the id for Maadi',
      'Copy the id for Nasr City',
      'Copy the id for hassan@nilecare.eg',
    ]);
  });

  it('announces a copy', async () => {
    stubClipboard('writes');
    const fixture = render();

    await press(fixture, copyButtons(fixture)[1]);

    const status = element(fixture).querySelector('.created__status');

    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent?.trim()).toBe('Subscription id copied.');
  });

  it('says nothing until something has been copied', () => {
    expect(element(render()).querySelector('.created__status')?.textContent?.trim()).toBe('');
  });

  it('goes quiet again, so "Copied" keeps meaning "just now"', async () => {
    vi.useFakeTimers();
    stubClipboard('writes');

    const fixture = render();

    // Not `press`: `whenStable` waits on a timer, and the timers are fake here.
    // Advancing them asynchronously flushes the clipboard promise as well.
    copyButtons(fixture)[0].click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(copyButtons(fixture)[0].textContent?.trim()).toBe('Copied');

    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();

    expect(copyButtons(fixture)[0].textContent?.trim()).toBe('Copy');
  });

  // A refused clipboard is not hypothetical: the API is absent on an insecure
  // origin, and a browser may deny the permission outright. A button that looked
  // like it worked would send somebody away with nothing on their clipboard.
  it('says so when the clipboard refuses, and points at the way round it', async () => {
    stubClipboard('refuses');
    const fixture = render();

    await press(fixture, copyButtons(fixture)[0]);

    expect(copyButtons(fixture)[0].textContent?.trim()).toBe("Couldn't copy");
    expect(element(fixture).querySelector('.created__status')?.textContent?.trim()).toBe(
      'Practice id could not be copied. Select it and copy it manually.',
    );
  });

  it('survives a clipboard that is not there at all', async () => {
    const fixture = render();

    // No stub: `navigator.clipboard` is undefined, exactly as on an insecure origin.
    await press(fixture, copyButtons(fixture)[0]);

    expect(copyButtons(fixture)[0].textContent?.trim()).toBe("Couldn't copy");
  });

  it('asks for another practice when the action is pressed', () => {
    const fixture = render();
    let asked = 0;

    fixture.componentInstance.another.subscribe(() => (asked += 1));
    element(fixture).querySelector<HTMLButtonElement>('.created__another')!.click();

    expect(asked).toBe(1);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AddPracticeButton } from './add-practice-button';

function render(large = false): ComponentFixture<AddPracticeButton> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });

  const fixture = TestBed.createComponent(AddPracticeButton);
  fixture.componentRef.setInput('link', '/practices/add');
  fixture.componentRef.setInput('large', large);
  fixture.detectChanges();

  return fixture;
}

function control(fixture: ComponentFixture<AddPracticeButton>): HTMLAnchorElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a')!;
}

describe('AddPracticeButton', () => {
  it('goes where it was told', () => {
    expect(control(render()).getAttribute('href')).toBe('/practices/add');
  });

  it('always carries its label, and never collapses to the glyph alone', () => {
    // 1024px is the supported floor and there is room. An icon-only primary
    // action is the one control on this screen nobody can name out loud.
    expect(control(render()).textContent?.trim()).toBe('Add a practice');
  });

  it('names itself with the label, not with the glyph', () => {
    const tile = control(render()).querySelector('.add-practice__tile');

    // The plus is the medical cross doing double duty - it is decorative twice
    // over, and announcing "plus" before "Add a practice" adds nothing.
    expect(tile?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a link, because it navigates', () => {
    // A control that goes somewhere should be openable in a new tab, and P-05
    // is a screen rather than a submission.
    expect(control(render()).tagName).toBe('A');
  });

  it('takes the empty-state size when asked', () => {
    expect(control(render(true)).classList).toContain('add-practice--large');
    expect(control(render(false)).classList).not.toContain('add-practice--large');
  });
});

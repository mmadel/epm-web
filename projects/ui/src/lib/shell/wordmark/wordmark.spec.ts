import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Wordmark } from './wordmark';

describe('Wordmark', () => {
  let fixture: ComponentFixture<Wordmark>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    fixture = TestBed.createComponent(Wordmark);
    fixture.componentRef.setInput('product', 'EPM');
    fixture.componentRef.setInput('consoleName', 'Staff');
    fixture.componentRef.setInput('link', '/practice');
    await fixture.whenStable();
  });

  it('renders the product name and the console name it was given', () => {
    expect(element().querySelector('.wordmark__product')?.textContent?.trim()).toBe('EPM');
    expect(element().querySelector('.wordmark__console')?.textContent?.trim()).toBe('Staff');
  });

  it('is a link to the home it was given', () => {
    // The wordmark is the way home from anywhere, including from the screen an
    // unmatched address renders. A mark that is not a link looks identical.
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/practice');
  });

  it('puts both halves inside the one link', () => {
    // A target covering half of what reads as a single object is a target people
    // miss, and the missed half is the product's name.
    const link = element().querySelector('a');

    expect(link?.querySelector('.wordmark__product')).not.toBeNull();
    expect(link?.querySelector('.wordmark__console')).not.toBeNull();
  });
});

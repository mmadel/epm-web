import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideEnvironmentName, ResolvedEnvironmentName } from '../environment/environment-name';
import { EnvironmentChip } from './environment-chip';

function render(environment: unknown): ComponentFixture<EnvironmentChip> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideEnvironmentName(environment)] });

  const fixture = TestBed.createComponent(EnvironmentChip);
  fixture.detectChanges();

  return fixture;
}

function chip(fixture: ComponentFixture<EnvironmentChip>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.environment-chip')!;
}

describe('EnvironmentChip', () => {
  // The whole table, including production. The chip existing in production is
  // the point of the component: a missing chip and a broken chip look
  // identical, so if production were the unmarked state then the default
  // appearance of every misconfiguration would be a header that reads as
  // production.
  it.each<[ResolvedEnvironmentName | string, string, string]>([
    ['local', 'Local', 'environment-chip--neutral'],
    ['development', 'Development', 'environment-chip--info'],
    ['staging', 'Staging', 'environment-chip--warning'],
    ['production', 'Production', 'environment-chip--danger'],
  ])('names %s in words and tints it', (environment, label, tone) => {
    const fixture = render(environment);

    expect(chip(fixture).textContent).toContain(label);
    expect(chip(fixture).classList).toContain(tone);
  });

  it('renders an unreadable environment as Unknown with production treatment', () => {
    const fixture = render('not-an-environment');

    // Production's colours, because an unresolvable state is treated as the
    // most dangerous one - but its own word, because a chip that claims to know
    // which environment this is would be worse than one that admits it does not.
    expect(chip(fixture).textContent).toContain('Unknown');
    expect(chip(fixture).textContent).not.toContain('Production');
    expect(chip(fixture).classList).toContain('environment-chip--danger');
  });

  it('says what the word refers to, for a reader who cannot see the header', () => {
    const fixture = render('production');

    expect(chip(fixture).textContent).toContain('Environment:');
  });

  it('does not announce the dot, which only repeats the word', () => {
    const fixture = render('production');

    expect(chip(fixture).querySelector('.environment-chip__dot')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

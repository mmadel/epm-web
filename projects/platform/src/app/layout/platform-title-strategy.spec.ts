import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';

import { provideEnvironmentName } from '../environment/environment-name';
import { PlatformTitleStrategy } from './platform-title-strategy';

async function titleAfter(url: string, environment: unknown): Promise<string> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', title: 'Practices', children: [] },
        { path: 'untitled', children: [] },
      ]),
      provideEnvironmentName(environment),
      { provide: TitleStrategy, useClass: PlatformTitleStrategy },
    ],
  });

  await TestBed.inject(Router).navigateByUrl(url);

  return TestBed.inject(Title).getTitle();
}

describe('PlatformTitleStrategy', () => {
  it.each([
    ['local', 'Practices · EPM Platform · Local'],
    ['development', 'Practices · EPM Platform · Development'],
    ['staging', 'Practices · EPM Platform · Staging'],
    ['production', 'Practices · EPM Platform · Production'],
  ])('names %s in the tab', async (environment, expected) => {
    expect(await titleAfter('/', environment)).toBe(expected);
  });

  it('names an unreadable environment Unknown in the tab too', async () => {
    expect(await titleAfter('/', 'nonsense')).toBe('Practices · EPM Platform · Unknown');
  });

  it('leaves no dangling separator for a route with no title', async () => {
    expect(await titleAfter('/untitled', 'local')).toBe('EPM Platform · Local');
  });
});

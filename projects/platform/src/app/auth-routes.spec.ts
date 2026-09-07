import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BASE_PATH } from 'api-client';
import {
  API_BASE_URL,
  AuthStatus,
  provideApiBaseUrl,
  providePlatformAdminSession,
  StubAuth,
  stubAuth,
} from 'core';
import { CONSOLE_AUTH } from 'core';

import { App } from './app';
import { routes } from './app.routes';
import { provideEnvironmentName } from './environment/environment-name';

/**
 * What the console shows before it shows the console.
 *
 * THE ASSERTION THIS FILE EXISTS FOR IS AN ABSENCE: in five of the six auth
 * states, no shell. T-111 §4 puts it as "never a flash of the signed-in shell",
 * and a flash is exactly what a test of the happy path cannot see - the frame
 * renders, gets covered over, and every screenshot afterwards looks right.
 *
 * IT DRIVES THE STATE RATHER THAN THE PROVIDER. There is no Keycloak here and
 * there should not be: what is under test is what the console draws for a state,
 * and reaching that state through a real redirect would make five tests depend on
 * a server being down in five different ways. `OidcConsoleAuth` is what decides
 * which state applies, and it is exercised by the scripted walk in the ticket.
 */
async function open(
  url: string,
  status: AuthStatus,
): Promise<{
  fixture: ComponentFixture<App>;
  element: HTMLElement;
  auth: StubAuth;
  router: Router;
  /** How many requests the console opened as it rendered. */
  requests: number;
}> {
  const auth = stubAuth({ status });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: CONSOLE_AUTH, useValue: auth },
      providePlatformAdminSession(),
      provideEnvironmentName('production'),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideApiBaseUrl('https://api.test.invalid'),
      { provide: BASE_PATH, useFactory: () => inject(API_BASE_URL) },
    ],
  });

  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(App);

  await router.navigateByUrl(url);
  TestBed.tick();

  // ANSWERED RATHER THAN AWAITED. The onboarding screen reads `listPlans` as it
  // opens, so `whenStable` never settles while it is outstanding - and the count
  // is worth returning, because "the console asked for nothing" is one of the
  // assertions below rather than a detail of the harness.
  const opened = TestBed.inject(HttpTestingController).match(() => true);

  for (const request of opened) {
    request.flush([{ plan: 'STANDARD', seatLimit: 20, branchLimit: 5 }]);
  }

  // The response reaches the resource on a microtask.
  await Promise.resolve();
  TestBed.tick();

  return {
    fixture,
    element: fixture.nativeElement as HTMLElement,
    auth,
    router,
    requests: opened.length,
  };
}

/** Every state in which the console itself must not be on the screen. */
const NOT_SIGNED_IN: AuthStatus[] = [
  'starting',
  'redirecting',
  'signingIn',
  'notPermitted',
  'providerUnreachable',
];

describe('the platform console before anybody is signed in', () => {
  it('renders no shell in any state but signed-in', async () => {
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open('/practices', status);

      // The frame, the wordmark, the environment chip and the account mark are all
      // things behind the sign-in. None of them may be in the document.
      expect(element.querySelector('lib-shell'), status).toBeNull();
      expect(element.querySelector('app-console-layout'), status).toBeNull();
      expect(element.querySelector('.console-account'), status).toBeNull();
    }
  });

  it('renders no routed screen in any of them either', async () => {
    // The shell and the screen inside it are two different things to get wrong.
    // The guard covers this one, and the two are asserted separately because a
    // change that removed either would leave the other passing.
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open('/onboard', status);

      expect(element.querySelector('main h1'), status).toBeNull();
      expect(element.querySelector('#practice-name'), status).toBeNull();
    }
  });

  it('leaves no route activated, whatever address was asked for', async () => {
    for (const status of NOT_SIGNED_IN) {
      const { router } = await open('/practices/org-1', status);

      expect(router.routerState.snapshot.root.firstChild, status).toBeNull();
    }
  });

  it('shows something in every one of them, and never an empty document', async () => {
    // The other half of "no shell". A console that rendered nothing would satisfy
    // every assertion above and would be a blank screen, which is the outcome
    // criterion 11 names specifically.
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open('/practices', status);

      expect(element.querySelector('app-auth-state-page'), status).not.toBeNull();
      expect(
        element.querySelector('.placeholder__heading')?.textContent?.trim(),
        status,
      ).toBeTruthy();
      expect(element.querySelector('.placeholder__body')?.textContent?.trim(), status).toBeTruthy();
    }
  });

  it('makes no API request in any of them', async () => {
    // Nothing behind the sign-in may reach the API before there is a token. A
    // screen that rendered and fetched would 401 and sign the person out of a
    // session they were still acquiring.
    for (const status of NOT_SIGNED_IN) {
      const { requests } = await open('/onboard', status);

      expect(requests, status).toBe(0);
      TestBed.inject(HttpTestingController).verify();
    }
  });
});

describe('the platform console when the provider cannot be reached', () => {
  it('names the provider', async () => {
    // CRITERION 11. "We could not sign you in" is a sentence somebody forwards to
    // a colleague who then asks which provider; the issuer answers that, and it is
    // also the string that is wrong when the configuration is what is wrong
    // (LLD-INFRASTRUCTURE.md §I5).
    const { element } = await open('/practices', 'providerUnreachable');

    expect(element.querySelector('.auth-state__issuer-value')?.textContent).toBe(
      'https://provider.test.invalid/realms/stub',
    );
  });

  it('offers a way to try again', async () => {
    const { element } = await open('/practices', 'providerUnreachable');

    expect(element.querySelector('.auth-state__action')?.textContent?.trim()).toBe('Try again');
  });
});

describe('the platform console when the API refused the account', () => {
  it('says so plainly, rather than looking like a failure', async () => {
    const { element } = await open('/practices', 'notPermitted');

    expect(element.querySelector('.placeholder__heading')?.textContent?.trim()).toBe(
      'Your account is not set up for this console',
    );
  });

  it('offers sign-out and nothing that would retry the login', async () => {
    // CRITERION 10, AS A COMPONENT ASSERTION. The token is valid, so signing in
    // again returns the same token and the same 403. A "try again" here is the
    // loop, and this is what would notice if somebody added one.
    const { element, auth } = await open('/practices', 'notPermitted');

    const actions = [...element.querySelectorAll('.auth-state__action')].map((action) =>
      action.textContent?.trim(),
    );

    expect(actions).toEqual(['Sign out']);
    expect(auth.refuseCount()).toBe(0);
  });

  it('ends the session at the provider when sign-out is pressed', async () => {
    const { element, auth } = await open('/practices', 'notPermitted');

    element.querySelector<HTMLButtonElement>('.auth-state__action')!.click();
    TestBed.tick();

    expect(auth.signOutCount()).toBe(1);
  });
});

describe('the platform console once somebody is signed in', () => {
  it('renders the shell, and the screen inside it', async () => {
    // The positive case, in the same file as its five negatives, so that a change
    // which made the console render in every state fails here rather than passing
    // everywhere.
    const { element } = await open('/onboard', 'signedIn');

    expect(element.querySelector('app-auth-state-page')).toBeNull();
    expect(element.querySelector('lib-shell')).not.toBeNull();
    expect(element.querySelector('main h1')?.textContent).toBe('New practice');
  });

  it('offers sign-out in the frame', async () => {
    // Criterion 7 needs somewhere to be pressed, and this is it. What pressing it
    // does - ending Keycloak's session rather than only the local one - is
    // `OidcConsoleAuth.signOut`'s business and is walked manually.
    const { element } = await open('/onboard', 'signedIn');

    expect(element.querySelector('.console-signout')?.textContent?.trim()).toBe('Sign out');
  });

  it('signs out through the seam when that control is pressed', async () => {
    const { element, auth } = await open('/onboard', 'signedIn');

    element.querySelector<HTMLButtonElement>('.console-signout')!.click();
    TestBed.tick();

    expect(auth.signOutCount()).toBe(1);
  });
});

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStatus, CONSOLE_AUTH, StubAuth, stubAuth } from 'core';

import { App } from './app';
import { appConfig } from './app.config';
import { ROUTE_PATHS } from './route-paths';

/**
 * What the staff console shows before it shows the console.
 *
 * THE ASSERTION THIS FILE EXISTS FOR IS AN ABSENCE: in five of the six auth
 * states, no shell. T-111 §4 puts it as "never a flash of the signed-in shell",
 * and a flash is exactly what a test of the happy path cannot see - the frame
 * renders, gets covered over, and every screenshot afterwards looks right.
 *
 * IT TAKES THE APPLICATION'S OWN PROVIDERS, with the stub after them so it wins.
 * The route table alone is not the configuration - `provideLanguage` is what makes
 * the strings on these pages resolve at all - and a harness that assembled its own
 * would pass with the translations switched off and every heading blank.
 *
 * THIS CONSOLE HAS NO SIGNED-IN CASE THAT REACHES THE API, and none is missing.
 * No staff account exists yet (T-111 §6), so what a real sign-in reaches is
 * Keycloak's login page - the expected end of criterion 12. The signed-in
 * assertions below are about the frame, which is all this console has.
 */
async function open(
  url: string,
  status: AuthStatus,
): Promise<{ element: HTMLElement; auth: StubAuth; router: Router }> {
  const auth = stubAuth({ status });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: CONSOLE_AUTH, useValue: auth },
    ],
  });

  const router = TestBed.inject(Router);
  const fixture: ComponentFixture<App> = TestBed.createComponent(App);

  await router.navigateByUrl(url);
  await fixture.whenStable();

  return { element: fixture.nativeElement as HTMLElement, auth, router };
}

/** Every state in which the console itself must not be on the screen. */
const NOT_SIGNED_IN: AuthStatus[] = [
  'starting',
  'redirecting',
  'signingIn',
  'notPermitted',
  'providerUnreachable',
];

describe('the staff console before anybody is signed in', () => {
  afterEach(() => {
    // Mounting anything here reads the language service, which labels the
    // document. Left behind, the attributes leak into whatever runs next.
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('renders no shell in any state but signed-in', async () => {
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open(ROUTE_PATHS.home, status);

      // The frame, the wordmark and the language switch are all things behind the
      // sign-in. None of them may be in the document.
      expect(element.querySelector('lib-shell'), status).toBeNull();
      expect(element.querySelector('.wordmark'), status).toBeNull();
      expect(element.querySelector('lib-language-switch'), status).toBeNull();
    }
  });

  it('renders no section in any of them either', async () => {
    // The shell and the screen inside it are two different things to get wrong.
    // The guard covers this one, and they are asserted separately because a
    // change that removed either would leave the other passing.
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open(ROUTE_PATHS.clinics, status);

      expect(element.querySelector('app-clinics-section'), status).toBeNull();
      expect(element.querySelector('router-outlet'), status).toBeNull();
    }
  });

  it('leaves no route activated, whatever address was asked for', async () => {
    for (const status of NOT_SIGNED_IN) {
      const { router } = await open(ROUTE_PATHS.subscription, status);

      expect(router.routerState.snapshot.root.firstChild, status).toBeNull();
    }
  });

  it('guards the unknown-address screen too', async () => {
    // "Page not found" is a screen inside the shell like any other. A console that
    // let a stranger reach it would be telling them which addresses do not exist,
    // and would be inconsistent about the one thing this ticket is about.
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open('/nowhere', status);

      expect(element.querySelector('app-not-found-page'), status).toBeNull();
    }
  });

  it('shows something in every one of them, and never an empty document', async () => {
    // The other half of "no shell". A console that rendered nothing would satisfy
    // every assertion above and would be a blank screen, which is the outcome
    // criterion 11 names specifically.
    for (const status of NOT_SIGNED_IN) {
      const { element } = await open(ROUTE_PATHS.home, status);

      expect(element.querySelector('app-auth-state-page'), status).not.toBeNull();
      expect(
        element.querySelector('.placeholder__heading')?.textContent?.trim(),
        status,
      ).toBeTruthy();
      expect(element.querySelector('.placeholder__body')?.textContent?.trim(), status).toBeTruthy();
    }
  });

  it('makes no HTTP request in any of them', async () => {
    for (const status of NOT_SIGNED_IN) {
      await open(ROUTE_PATHS.home, status);

      TestBed.inject(HttpTestingController).verify();
    }
  });

  it('resolves its wording through the translations rather than hardcoding it', async () => {
    // The difference between this component and the platform console's, and the
    // reason they are two files. A string written into this template would be the
    // one part of the product that stayed English after a language switch.
    const { element } = await open(ROUTE_PATHS.home, 'redirecting');

    const body = element.querySelector('.placeholder__body')?.textContent?.trim();

    expect(body).toBe('Taking you to sign in…');
    // Not the key itself, which is what a missing registration in
    // `translations/index.ts` would render.
    expect(body).not.toContain('auth.state');
  });
});

describe('the staff console when the provider cannot be reached', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('names the provider, left-to-right whatever the page direction is', async () => {
    // CRITERION 11, plus the thing that is only a problem in a bilingual console: a
    // URL rendered inside an RTL paragraph has its scheme and path swapped around
    // on screen, which is unreadable exactly when somebody is comparing it
    // character by character against a `.well-known` document.
    const { element } = await open(ROUTE_PATHS.home, 'providerUnreachable');
    const issuer = element.querySelector('.auth-state__issuer-value');

    expect(issuer?.textContent).toBe('https://provider.test.invalid/realms/stub');
    expect(issuer?.getAttribute('dir')).toBe('ltr');
  });
});

describe('the staff console when the API refused the account', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('offers sign-out and nothing that would retry the login', async () => {
    // CRITERION 10, AS A COMPONENT ASSERTION. The token is valid, so signing in
    // again returns the same token and the same 403. A "try again" here is the
    // loop, and this is what would notice if somebody added one.
    const { element, auth } = await open(ROUTE_PATHS.home, 'notPermitted');

    const actions = [...element.querySelectorAll('.auth-state__action')].map((action) =>
      action.textContent?.trim(),
    );

    expect(actions).toEqual(['Sign out']);
    expect(auth.refuseCount()).toBe(0);
  });
});

describe('the staff console once somebody is signed in', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('renders the frame, and the screen inside it', async () => {
    // The positive case, in the same file as its five negatives, so that a change
    // which made the console render in every state fails here rather than passing
    // everywhere.
    const { element } = await open(ROUTE_PATHS.home, 'signedIn');

    expect(element.querySelector('app-auth-state-page')).toBeNull();
    expect(element.querySelector('lib-shell')).not.toBeNull();
    expect(element.querySelector('.practice-home__title')?.textContent?.trim()).toBe(
      'Your practice',
    );
  });

  it('offers sign-out in the frame, beside the language switch', async () => {
    // Criterion 7 needs somewhere to be pressed. What pressing it does - ending
    // Keycloak's session rather than only the local one - is
    // `OidcConsoleAuth.signOut`'s business and is walked manually.
    const { element } = await open(ROUTE_PATHS.home, 'signedIn');
    const end = element.querySelector('.shell-header__end');

    expect(end?.querySelector('lib-language-switch')).not.toBeNull();
    expect(end?.querySelector('.staff-signout')?.textContent?.trim()).toBe('Sign out');
  });

  it('signs out through the seam when that control is pressed', async () => {
    const { element, auth } = await open(ROUTE_PATHS.home, 'signedIn');

    element.querySelector<HTMLButtonElement>('.staff-signout')!.click();
    TestBed.tick();

    expect(auth.signOutCount()).toBe(1);
  });
});

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { isApiRequest } from './api-request';
import { CONSOLE_AUTH } from './console-auth';

/**
 * What the console does when the API answers 401 or 403.
 *
 * THE TWO ARE OPPOSITE ANSWERS AND GET OPPOSITE TREATMENT, and getting that
 * backwards is the single failure T-111 was written to catch.
 *
 * **401 - the token is not good.** Expired, tampered with, or issued by somebody
 * this API does not trust. Signing in again is the right answer, so the session
 * is ended and the console goes back to the login redirect. A console that
 * instead sat on a spinner would look identical to one that was still loading
 * (criterion 9).
 *
 * **403 - the token is good and its owner is not.** A valid token whose `sub`
 * matches no row (`LLD-IDENTITY.md` §4). Signing in again produces THE SAME VALID
 * TOKEN and the same 403, so retrying the login here bounces the tab between the
 * console and Keycloak until somebody closes it. Nothing is retried; the console
 * shows a page that says so (criterion 10).
 *
 * IT ONLY LOOKS AT THE API'S ANSWERS. A 401 from anywhere else - the provider,
 * some future third party - says nothing about this console's session, and
 * signing a working user out because an unrelated host refused a request would be
 * a defect nobody could reproduce.
 *
 * THE ERROR IS ALWAYS RETHROWN. Screens have their own failure states and their
 * own words for them; swallowing the error here would leave a list sitting on a
 * spinner while the console navigated out from under it.
 */
export const apiAuthErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const origin = inject(DOCUMENT).location?.origin ?? '';

  if (!isApiRequest(request.url, apiBaseUrl, origin)) {
    return next(request);
  }

  const auth = inject(CONSOLE_AUTH);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          auth.sessionEnded();
        } else if (error.status === 403) {
          auth.refuse();
        }
      }

      return throwError(() => error);
    }),
  );
};

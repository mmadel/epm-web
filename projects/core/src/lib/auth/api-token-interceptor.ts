import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { switchMap, take } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { isApiRequest } from './api-request';
import { CONSOLE_AUTH } from './console-auth';

/**
 * Puts `Authorization: Bearer` on requests to the EPM API, and on nothing else.
 *
 * THE SECOND HALF OF THAT SENTENCE IS THE FEATURE. An interceptor that attaches
 * the token to every outbound request hands it to the identity provider, to any
 * CDN the console fetches from, and to whatever it is asked to talk to next - and
 * it does so silently, because a request that carries one header too many still
 * succeeds. {@link isApiRequest} is where the line is drawn and where it is
 * tested; this file is the plumbing around it.
 *
 * THE BASE URL COMES FROM THE INJECTED TOKEN, which under `ng serve` is the empty
 * string, which makes an API request a relative `/api/...` one that the dev
 * server proxies to the backend. That is what keeps the browser on a single
 * origin and CORS out of this ticket entirely (T-111 §5.3); an absolute
 * `http://localhost:8080` here would bypass the proxy, fail at preflight, and
 * ship a development address in the bundle.
 *
 * A REQUEST WITH NO TOKEN IS SENT WITHOUT ONE rather than held or refused. The
 * console does not render anything that calls the API until it is signed in, so
 * this is a state that should not arise; if it does, the API's own 401 is a
 * better report of it than an interceptor inventing an error the network tab
 * cannot show.
 */
export const apiTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const origin = inject(DOCUMENT).location?.origin ?? '';

  // Decided BEFORE the token is asked for, so a request to anywhere else does not
  // even touch the auth seam - it stays a plain synchronous pass-through.
  if (!isApiRequest(request.url, apiBaseUrl, origin)) {
    return next(request);
  }

  return inject(CONSOLE_AUTH)
    .accessToken()
    .pipe(
      // The token is read from storage and emits at once. `take(1)` is what keeps
      // it a read rather than a subscription: without it a source that emitted
      // again on silent renew would re-issue the request.
      take(1),
      switchMap((token) =>
        next(
          token === ''
            ? request
            : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
        ),
      ),
    );
};

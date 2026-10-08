import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, throwError } from 'rxjs';
import { ACT_AS_HEADER, AccountService } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { TERMS_BLOCKED_CODES, TermsService } from '../services/terms.service';

/**
 * Ensures cookies ride along (so the oauth2-proxy session is presented), attaches X-Act-As when
 * the session has switched to managing another account (issue #409), and turns an upstream 401
 * into a re-authentication redirect through the proxy: the session cookie has expired, so bounce
 * the user back through Keycloak. A 403 from the terms gate (issue #417, e.g. the terms were updated
 * mid-session) sends the user to accept them. Sends the UI language as Accept-Language so API
 * messages come back in it (issue #33).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const account = inject(AccountService);
  const router = inject(Router);
  const terms = inject(TermsService);
  const activeAccountId = account.activeAccountId();
  let headers = req.headers.set('Accept-Language', inject(TranslocoService).getActiveLang());
  if (activeAccountId) headers = headers.set(ACT_AS_HEADER, activeAccountId);
  const authedReq = req.clone({ withCredentials: true, headers });

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isUserInfo = req.url.includes('/oauth2/');
      if (err.status === 401 && !isUserInfo) {
        auth.signIn();
      }
      if (err.status === 403 && TERMS_BLOCKED_CODES.includes(err.error?.code)) {
        terms
          .load()
          .subscribe({ next: () => router.navigateByUrl('/terms'), error: () => undefined });
      }
      return throwError(() => err);
    }),
  );
};

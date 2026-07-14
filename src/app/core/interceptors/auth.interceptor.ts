import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Ensures cookies ride along (so the oauth2-proxy session is presented) and turns an
 * upstream 401 into a re-authentication redirect through the proxy — the session cookie
 * has expired, so bounce the user back through Keycloak.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const authedReq = req.clone({ withCredentials: true });

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isUserInfo = req.url.includes('/oauth2/');
      if (err.status === 401 && !isUserInfo) {
        auth.signIn();
      }
      return throwError(() => err);
    }),
  );
};

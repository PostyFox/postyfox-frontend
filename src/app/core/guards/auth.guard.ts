import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The proxy already gates access, so a loaded user is the normal case. If userinfo could not
 * be read (session gone), kick off a sign-in redirect rather than showing a broken page.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.user()) {
    return true;
  }
  auth.signIn();
  return false;
};

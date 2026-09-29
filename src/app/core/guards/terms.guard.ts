import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TermsService } from '../services/terms.service';

/** Sends the user to accept the terms of service before anything else (issue #417). */
export const termsGuard: CanActivateFn = () => {
  const terms = inject(TermsService);
  return terms.blocked() ? inject(Router).createUrlTree(['/terms']) : true;
};

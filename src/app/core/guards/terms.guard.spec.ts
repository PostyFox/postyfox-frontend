import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { TermsStatus } from '../models/api.models';
import { TermsService } from '../services/terms.service';
import { termsGuard } from './terms.guard';
import { translocoTesting } from '../../../testing/transloco-testing';

/** Issue #417: nothing past the terms page until the current terms are accepted. */
describe('terms of service gate', () => {
  const current = { version: 2, content: '# Terms', publishedAt: '2026-09-29T00:00:00Z' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  function guardWith(status: TermsStatus | null): boolean | UrlTree {
    TestBed.inject(TermsService).status.set(status);
    return TestBed.runInInjectionContext(
      () => termsGuard({} as never, {} as never) as boolean | UrlTree,
    );
  }

  it('allows navigation when no terms are in force or they are accepted', () => {
    expect(guardWith(null)).toBe(true);
    expect(guardWith({ current: null, accepted: true, ownerAccepted: true })).toBe(true);
    expect(guardWith({ current, accepted: true, ownerAccepted: true })).toBe(true);
  });

  it('redirects to /terms until the user and the account owner have accepted', () => {
    const router = TestBed.inject(Router);
    for (const status of [
      { current, accepted: false, ownerAccepted: false },
      { current, accepted: true, ownerAccepted: false },
    ]) {
      const result = guardWith(status);
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/terms');
    }
  });

  it('sends the user to /terms when the API refuses a request with a terms code', () => {
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    http.get(`${environment.apiBaseUrl}/templates`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/templates`)
      .flush({ code: 'terms_not_accepted' }, { status: 403, statusText: 'Forbidden' });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/terms`)
      .flush({ current, accepted: false, ownerAccepted: true });

    expect(navigate).toHaveBeenCalledWith('/terms');
    expect(TestBed.inject(TermsService).blocked()).toBe(true);
    httpMock.verify();
  });

  it('leaves other 403s alone', () => {
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    http.get(`${environment.apiBaseUrl}/admin/access`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/access`)
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(navigate).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

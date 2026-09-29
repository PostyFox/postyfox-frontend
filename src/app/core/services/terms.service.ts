import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TermsOfService, TermsStatus } from '../models/api.models';

/** 403 `code` values the API's terms gate returns (issue #417). */
export const TERMS_BLOCKED_CODES = ['terms_not_accepted', 'owner_terms_not_accepted'];

/**
 * Terms of service (issue #417). While terms are in force the API refuses everything else until the
 * signed-in person, and the account they act as, have accepted the current version.
 */
@Injectable({ providedIn: 'root' })
export class TermsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/terms`;

  readonly status = signal<TermsStatus | null>(null);

  readonly blocked = computed(() => {
    const s = this.status();
    return !!s?.current && (!s.accepted || !s.ownerAccepted);
  });

  load(): Observable<TermsStatus> {
    return this.http.get<TermsStatus>(this.base).pipe(tap((s) => this.status.set(s)));
  }

  accept(version: number): Observable<void> {
    return this.http.post<void>(`${this.base}/accept`, { version });
  }

  /** Admin only. Blank content turns the terms off (the API answers 204 with no body). */
  publish(content: string): Observable<TermsOfService | null> {
    return this.http.put<TermsOfService | null>(`${environment.apiBaseUrl}/admin/terms`, {
      content,
    });
  }
}

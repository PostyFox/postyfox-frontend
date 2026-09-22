import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcceptInviteRequest,
  AccountAccess,
  AccountInvite,
  AccountMember,
  CreateInviteRequest,
} from '../models/api.models';

/** Header the backend's act-as claims transformation validates (issue #409). */
export const ACT_AS_HEADER = 'X-Act-As';

const ACTIVE_ACCOUNT_STORAGE_KEY = 'postyfox.activeAccountId';

/**
 * Account delegation (issue #409): invites, memberships, and which account the current session
 * is acting as. The active account id is per-browser (not synced server-side beyond the X-Act-As
 * header the interceptor attaches), so a switch takes effect by reloading the app.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/profile`;

  /** Accounts the current session can act as (self + accepted memberships). Loaded once at bootstrap. */
  readonly accounts = signal<AccountAccess[]>([]);

  /** null = acting as self (no X-Act-As header sent). */
  readonly activeAccountId = signal<string | null>(readStoredActiveAccountId());

  readonly activeAccount = computed(() => {
    const id = this.activeAccountId();
    return id ? (this.accounts().find((a) => a.userId === id) ?? null) : null;
  });

  /** Loaded once at bootstrap (see provideAppInitializer); never throws. */
  loadAccounts(): Observable<AccountAccess[]> {
    return this.http
      .get<AccountAccess[]>(`${this.base}/accounts`)
      .pipe(tap((a) => this.accounts.set(a)));
  }

  /** Switches which account subsequent requests act as, then reloads so all views refresh clean. */
  switchTo(userId: string | null): void {
    try {
      if (userId) localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, userId);
      else localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    } catch {
      /* private browsing / blocked storage: the switch still applies for this page load */
    }
    this.activeAccountId.set(userId);
    window.location.reload();
  }

  inviteMember(email: string): Observable<AccountInvite> {
    const body: CreateInviteRequest = { email };
    return this.http.post<AccountInvite>(`${this.base}/invites`, body);
  }

  listSentInvites(): Observable<AccountInvite[]> {
    return this.http.get<AccountInvite[]>(`${this.base}/invites`);
  }

  listPendingInvites(): Observable<AccountInvite[]> {
    return this.http.get<AccountInvite[]>(`${this.base}/invites/pending`);
  }

  revokeInvite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invites/${id}`);
  }

  acceptInvite(token: string): Observable<void> {
    const body: AcceptInviteRequest = { token };
    return this.http.post<void>(`${this.base}/invites/accept`, body);
  }

  /** Accepts from the "invitations waiting for you" list, without needing the emailed token. */
  acceptInviteById(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/invites/${id}/accept`, {});
  }

  listMembers(): Observable<AccountMember[]> {
    return this.http.get<AccountMember[]>(`${this.base}/members`);
  }

  removeMember(memberUserId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${encodeURIComponent(memberUserId)}`);
  }
}

function readStoredActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

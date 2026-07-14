import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserInfo } from '../models/api.models';

/**
 * Identity is owned by the oauth2-proxy edge, not the browser. The SPA is served *through*
 * the proxy, so by the time it loads the user already has a valid session cookie. This service
 * simply reads `/oauth2/userinfo` for display, and drives sign-in/out via the proxy endpoints.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private oauth2 = environment.oauth2BaseUrl;

  readonly user = signal<UserInfo | null>(null);
  readonly loaded = signal(false);

  readonly displayName = computed(() => {
    const u = this.user();
    return u?.preferredUsername || u?.user || u?.email || 'Account';
  });

  readonly email = computed(() => this.user()?.email ?? '');

  /** Loaded once at bootstrap (see provideAppInitializer). Never throws. */
  loadUser() {
    return this.http.get<UserInfo>(`${this.oauth2}/userinfo`).pipe(
      tap((u) => this.user.set(u)),
      catchError(() => of(null)),
      tap(() => this.loaded.set(true)),
    );
  }

  /** Redirect through the proxy to (re)authenticate, returning to the current location. */
  signIn(returnTo: string = window.location.pathname + window.location.search): void {
    window.location.href = `${this.oauth2}/sign_in?rd=${encodeURIComponent(returnTo)}`;
  }

  /** Clear the proxy session and return to the app root. */
  signOut(): void {
    window.location.href = `${this.oauth2}/sign_out?rd=${encodeURIComponent('/')}`;
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiKey, ApiKeyCreated, CreateKeyRequest, UserSettings } from '../models/api.models';

/**
 * `/api/profile/keys` (API key management), `/api/profile/settings` (user preferences) and
 * `/api/profile/avatar` (the signed-in user's Gravatar, issue #420).
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/profile/keys`;

  /** Bumped whenever settings are saved, so the navbar re-requests the avatar after an opt-in/out. */
  private readonly avatarRevision = signal(0);
  /** Served same-origin by the API, so the browser never contacts Gravatar; 404s when unavailable. */
  readonly avatarUrl = computed(
    () => `${environment.apiBaseUrl}/profile/avatar?size=64&v=${this.avatarRevision()}`,
  );

  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${environment.apiBaseUrl}/profile/settings`);
  }

  updateSettings(body: UserSettings): Observable<UserSettings> {
    return this.http
      .put<UserSettings>(`${environment.apiBaseUrl}/profile/settings`, body)
      .pipe(tap(() => this.avatarRevision.update((v) => v + 1)));
  }

  listKeys(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.base);
  }

  createKey(body: CreateKeyRequest): Observable<ApiKeyCreated> {
    return this.http.post<ApiKeyCreated>(this.base, body);
  }

  revokeKey(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

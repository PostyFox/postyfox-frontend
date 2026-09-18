import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiKey, ApiKeyCreated, CreateKeyRequest, UserSettings } from '../models/api.models';

/** `/api/profile/keys` (API key management) and `/api/profile/settings` (user preferences). */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/profile/keys`;

  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${environment.apiBaseUrl}/profile/settings`);
  }

  updateSettings(body: UserSettings): Observable<UserSettings> {
    return this.http.put<UserSettings>(`${environment.apiBaseUrl}/profile/settings`, body);
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

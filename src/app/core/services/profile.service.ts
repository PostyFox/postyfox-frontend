import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiKey, ApiKeyCreated, CreateKeyRequest } from '../models/api.models';

/** `/api/profile/keys` — API key management. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/profile/keys`;

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

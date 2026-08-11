import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationalSecret } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin/operational-secrets`;

  listOperationalSecrets(): Observable<OperationalSecret[]> {
    return this.http.get<OperationalSecret[]>(this.base);
  }

  setOperationalSecret(key: string, value: string): Observable<OperationalSecret> {
    return this.http.put<OperationalSecret>(`${this.base}/${encodeURIComponent(key)}`, { value });
  }

  deleteOperationalSecret(key: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(key)}`);
  }
}

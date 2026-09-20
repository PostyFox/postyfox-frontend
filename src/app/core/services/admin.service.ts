import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationalSecret, PairedUserAgentSetting } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/admin/operational-secrets`;
  private userAgentsBase = `${environment.apiBaseUrl}/admin/paired-user-agents`;

  listOperationalSecrets(): Observable<OperationalSecret[]> {
    return this.http.get<OperationalSecret[]>(this.base);
  }

  setOperationalSecret(key: string, value: string): Observable<OperationalSecret> {
    return this.http.put<OperationalSecret>(`${this.base}/${encodeURIComponent(key)}`, { value });
  }

  deleteOperationalSecret(key: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(key)}`);
  }

  listPairedUserAgents(): Observable<PairedUserAgentSetting[]> {
    return this.http.get<PairedUserAgentSetting[]>(this.userAgentsBase);
  }

  setPairedUserAgent(
    platform: string,
    usePairedUserAgent: boolean,
  ): Observable<PairedUserAgentSetting> {
    return this.http.put<PairedUserAgentSetting>(
      `${this.userAgentsBase}/${encodeURIComponent(platform)}`,
      { usePairedUserAgent },
    );
  }
}

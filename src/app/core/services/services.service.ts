import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServiceDefinition } from '../models/api.models';

/** `/api/services` — the platform catalogue (Discord, Telegram, BlueSky, Tumblr, …). */
@Injectable({ providedIn: 'root' })
export class ServicesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/services`;

  list(): Observable<ServiceDefinition[]> {
    return this.http.get<ServiceDefinition[]>(this.base);
  }

  get(id: string): Observable<ServiceDefinition> {
    return this.http.get<ServiceDefinition>(`${this.base}/${encodeURIComponent(id)}`);
  }
}

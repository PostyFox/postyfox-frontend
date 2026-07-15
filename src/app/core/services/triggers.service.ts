import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Trigger, TriggerRegistrationRequest } from '../models/api.models';

/** `/api/triggers` — external-trigger registration. */
@Injectable({ providedIn: 'root' })
export class TriggersService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/triggers`;

  list(): Observable<Trigger[]> {
    return this.http.get<Trigger[]>(this.base);
  }

  register(body: TriggerRegistrationRequest): Observable<Trigger> {
    return this.http.post<Trigger>(this.base, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

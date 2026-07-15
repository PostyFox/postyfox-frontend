import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Template, TemplateUpsertRequest } from '../models/api.models';

/** `/api/templates` — posting template CRUD. */
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/templates`;

  list(): Observable<Template[]> {
    return this.http.get<Template[]>(this.base);
  }

  get(id: string): Observable<Template> {
    return this.http.get<Template>(`${this.base}/${id}`);
  }

  upsert(body: TemplateUpsertRequest): Observable<Template> {
    return this.http.put<Template>(this.base, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

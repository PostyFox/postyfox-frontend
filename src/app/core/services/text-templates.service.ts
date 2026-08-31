import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TextTemplate, TextTemplateUpsertRequest } from '../models/api.models';

/**
 * `/api/text-templates` — reusable named text-snippet CRUD. Referenced inline in a post as
 * `{{tt:name}}` and resolved server-side per delivery target at generation time.
 */
@Injectable({ providedIn: 'root' })
export class TextTemplatesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/text-templates`;

  list(): Observable<TextTemplate[]> {
    return this.http.get<TextTemplate[]>(this.base);
  }

  get(id: string): Observable<TextTemplate> {
    return this.http.get<TextTemplate>(`${this.base}/${id}`);
  }

  upsert(body: TextTemplateUpsertRequest): Observable<TextTemplate> {
    return this.http.put<TextTemplate>(this.base, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

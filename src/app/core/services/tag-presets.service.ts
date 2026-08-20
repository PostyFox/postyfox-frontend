import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TagPreset, TagPresetUpsertRequest } from '../models/api.models';

/** `/api/tag-presets` — reusable named tag-set CRUD, applied client-side into the compose tags field. */
@Injectable({ providedIn: 'root' })
export class TagPresetsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/tag-presets`;

  list(): Observable<TagPreset[]> {
    return this.http.get<TagPreset[]>(this.base);
  }

  get(id: string): Observable<TagPreset> {
    return this.http.get<TagPreset>(`${this.base}/${id}`);
  }

  upsert(body: TagPresetUpsertRequest): Observable<TagPreset> {
    return this.http.put<TagPreset>(this.base, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

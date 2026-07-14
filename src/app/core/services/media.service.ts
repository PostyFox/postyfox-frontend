import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MediaRef } from '../models/api.models';

/** `/api/media` — multipart upload returning a MediaRef to attach to a post. */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/media`;

  upload(file: File): Observable<MediaRef> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<MediaRef>(this.base, form);
  }
}

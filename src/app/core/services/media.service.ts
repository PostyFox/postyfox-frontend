import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MediaLimits, MediaRef } from '../models/api.models';

/** `/api/media`: multipart upload returning a MediaRef to attach to a post. */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/media`;

  /**
   * Uploads a file, reporting progress along the way. Emits `HttpEventType.UploadProgress` events
   * as the body streams out, then an `HttpEventType.Response` event carrying the `MediaRef`
   * (`event.body`) once the server has stored it — consumers care only about those two event types.
   */
  upload(file: File): Observable<HttpEvent<MediaRef>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<MediaRef>(this.base, form, { reportProgress: true, observe: 'events' });
  }

  /** The gateway's configured upload cap (if any), for blocking an oversized file before it's sent. */
  getLimits(): Observable<MediaLimits> {
    return this.http.get<MediaLimits>(`${this.base}/limits`);
  }
}

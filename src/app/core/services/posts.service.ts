import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePostRequest,
  CreatePostResponse,
  PostStatus,
  PostSummary,
} from '../models/api.models';

/** `/api/posts` — post intake (post-api) + aggregated status + history/activity list. */
@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/posts`;

  create(body: CreatePostRequest): Observable<CreatePostResponse> {
    return this.http.post<CreatePostResponse>(this.base, body);
  }

  getStatus(id: string): Observable<PostStatus> {
    return this.http.get<PostStatus>(`${this.base}/${id}`);
  }

  /**
   * Lists the user's posts (newest first), bounded server-side by the retention window.
   * `filter='active'` returns only posts still being processed.
   */
  list(filter?: 'active', limit?: number): Observable<PostSummary[]> {
    let params = new HttpParams();
    if (filter) params = params.set('filter', filter);
    if (limit != null) params = params.set('limit', limit);
    return this.http.get<PostSummary[]>(this.base, { params });
  }
}

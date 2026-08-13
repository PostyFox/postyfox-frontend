import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePostRequest,
  CreatePostResponse,
  PostContent,
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

  /** Returns a post's authored content as-is (no media duplication) — used to load a draft for editing. */
  getContent(id: string): Observable<PostContent> {
    return this.http.get<PostContent>(`${this.base}/${id}/content`);
  }

  /** Overwrites a draft's authored content/targets in place. 409 if it's already been published. */
  updateDraft(id: string, body: CreatePostRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  /** Resolves a draft's stored targets and submits it for delivery; it stops being a draft. */
  publish(id: string): Observable<CreatePostResponse> {
    return this.http.post<CreatePostResponse>(`${this.base}/${id}/publish`, null);
  }

  /**
   * Prepares a post for "post again": returns its authored content with media copied to fresh blobs,
   * so the recreated post is independent of the original. Does not itself create a post.
   */
  duplicate(id: string): Observable<PostContent> {
    return this.http.post<PostContent>(`${this.base}/${id}/duplicate`, null);
  }

  /** Cancels every target that hasn't been sent yet. 409 if there's nothing left to cancel. */
  cancel(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, null);
  }

  /** Permanently deletes a post (and its stored payload). Works for history + stale queued rows. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
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

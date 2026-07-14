import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePostRequest, CreatePostResponse, PostStatus } from '../models/api.models';

/** `/api/posts` — post intake (post-api) + aggregated status. */
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
}

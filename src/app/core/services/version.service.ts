import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { APP_VERSION } from '../../../version';

interface VersionResponse {
  service: string;
  version: string;
}

/** Surfaces the frontend build version (baked in) and the core API version (fetched at runtime). */
@Injectable({ providedIn: 'root' })
export class VersionService {
  private http = inject(HttpClient);

  /** This SPA's version, baked in at build time (see scripts/set-version.mjs). */
  readonly frontend = APP_VERSION;

  /** Version reported by core-api's `/api/version`; `unknown` until loaded / on error. */
  readonly backend = signal('unknown');

  constructor() {
    this.http
      .get<VersionResponse>(`${environment.apiBaseUrl}/version`)
      .pipe(catchError(() => of({ service: '', version: 'unknown' } as VersionResponse)))
      .subscribe((r) => this.backend.set(r.version || 'unknown'));
  }
}

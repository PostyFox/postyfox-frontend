import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

interface DeploymentConfig {
  operatorName?: string;
  operatorContact?: string;
}

/**
 * Deployment-specific configuration for a self-hosted PostyFox instance (e.g. the operator's name
 * and contact address used in the privacy policy).
 *
 * PostyFox ships as a single prebuilt image shared across every deployment, so these values can't
 * be baked in at build time — instead they're written into `deployment-config.json` (a static
 * asset) by the container's nginx entrypoint from the `OPERATOR_NAME` / `OPERATOR_CONTACT`
 * environment variables, and fetched once here at app startup (see provideAppInitializer).
 */
@Injectable({ providedIn: 'root' })
export class DeploymentConfigService {
  private http = inject(HttpClient);

  private readonly config = signal<DeploymentConfig>({});

  readonly operatorName = computed(() => this.config().operatorName?.trim() || '');
  readonly operatorContact = computed(() => this.config().operatorContact?.trim() || '');

  /** True once both operator identity and contact address have been configured for this instance. */
  readonly isConfigured = computed(() => !!this.operatorName() && !!this.operatorContact());

  /** Loaded once at bootstrap (see provideAppInitializer). Never throws. */
  load() {
    return this.http.get<DeploymentConfig>('/deployment-config.json').pipe(
      tap((c) => this.config.set(c ?? {})),
      catchError(() => of(null)),
    );
  }
}

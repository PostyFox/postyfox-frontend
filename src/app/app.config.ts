import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AccountService } from './core/services/account.service';
import { AuthService } from './core/services/auth.service';
import { DeploymentConfigService } from './core/services/deployment-config.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideMarkdown(),
    // Resolve the current user (via the proxy) before the first route renders.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).loadUser())),
    // Load this instance's deployment config (operator name/contact) before the first route renders.
    provideAppInitializer(() => firstValueFrom(inject(DeploymentConfigService).load())),
    // Load accounts this session can act as (issue #409), so the profile dropdown's "switch
    // account" list is ready before first render. Never throws: an anonymous/unauthenticated
    // load 401s and is swallowed the same way loadUser's is.
    provideAppInitializer(() =>
      firstValueFrom(inject(AccountService).loadAccounts()).catch(() => undefined),
    ),
  ],
};

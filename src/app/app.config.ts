import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideMarkdown } from 'ngx-markdown';
import { firstValueFrom } from 'rxjs';

import {
  AVAILABLE_LANGS,
  DEFAULT_LANG,
  TranslatedTitleStrategy,
  TranslocoHttpLoader,
} from './core/i18n/i18n';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AccountService } from './core/services/account.service';
import { AuthService } from './core/services/auth.service';
import { DeploymentConfigService } from './core/services/deployment-config.service';
import { LanguageService } from './core/services/language.service';
import { TermsService } from './core/services/terms.service';
import { ThemeService } from './core/services/theme.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Dates/numbers in pipes follow the UI language (issues #32, #33).
    { provide: LOCALE_ID, useFactory: () => inject(LanguageService).lang },
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideMarkdown(),
    provideTransloco({
      config: {
        availableLangs: AVAILABLE_LANGS,
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    // Locale data and translations (issue #33) before first render, so `translate()` in code is
    // always ready.
    provideAppInitializer(() => inject(LanguageService).load()),
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
    // Terms of service status (issue #417), so termsGuard can redirect before first render.
    provideAppInitializer(() => firstValueFrom(inject(TermsService).load()).catch(() => undefined)),
    // Colour theme (issue #422): start tracking the user's choice / OS preference on every page.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ],
};

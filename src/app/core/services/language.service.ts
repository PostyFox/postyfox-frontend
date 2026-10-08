import { DOCUMENT, registerLocaleData } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LANGUAGE_STORAGE_KEY, LOCALE_DATA, RTL_LANGS, initialLang } from '../i18n/i18n';

/**
 * UI language (issue #33). Fixed for the page load, because LOCALE_ID (date and number pipes) can't
 * change once the app has started: picking another language stores it per-browser and reloads.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private document = inject(DOCUMENT);
  private transloco = inject(TranslocoService);

  readonly lang = initialLang();

  constructor() {
    this.transloco.setActiveLang(this.lang);
    this.document.documentElement.lang = this.lang;
    this.document.documentElement.dir = RTL_LANGS.has(this.lang) ? 'rtl' : 'ltr';
  }

  /** Locale data and translations for the active language, before first render. */
  async load(): Promise<void> {
    const data = await LOCALE_DATA[this.lang]();
    registerLocaleData(data.default, this.lang);
    await firstValueFrom(this.transloco.load(this.lang));
  }

  setLang(lang: string): void {
    if (lang === this.lang) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Storage unavailable (private mode): the choice can't survive the reload, so don't reload.
      return;
    }
    this.reload();
  }

  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}

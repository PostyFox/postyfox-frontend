import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Translation, TranslocoLoader, translate } from '@jsverse/transloco';

/**
 * UI languages with a translation file in `public/i18n/<lang>.json` (issue #33), synced from
 * Crowdin. `name` is the language's own name, so it reads right whatever language is active.
 */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'af-ZA', name: 'Afrikaans' },
  { code: 'ca-ES', name: 'Català' },
  { code: 'cs-CZ', name: 'Čeština' },
  { code: 'da-DK', name: 'Dansk' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'hu-HU', name: 'Magyar' },
  { code: 'nl-NL', name: 'Nederlands' },
  { code: 'no-NO', name: 'Norsk' },
  { code: 'pl-PL', name: 'Polski' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'ro-RO', name: 'Română' },
  { code: 'fi-FI', name: 'Suomi' },
  { code: 'sv-SE', name: 'Svenska' },
  { code: 'vi-VN', name: 'Tiếng Việt' },
  { code: 'tr-TR', name: 'Türkçe' },
  { code: 'el-GR', name: 'Ελληνικά' },
  { code: 'ru-RU', name: 'Русский' },
  { code: 'sr-SP', name: 'Српски' },
  { code: 'uk-UA', name: 'Українська' },
  { code: 'he-IL', name: 'עברית' },
  { code: 'ar-SA', name: 'العربية' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
];
export const AVAILABLE_LANGS = LANGUAGES.map((l) => l.code);
export const DEFAULT_LANG = 'en-GB';
export const LANGUAGE_STORAGE_KEY = 'postyfox.language';
export const RTL_LANGS = new Set(['ar-SA', 'he-IL']);

/**
 * Angular locale data (dates, numbers) per UI language, loaded on demand. Crowdin's codes don't all
 * match Angular's: sr-SP is Serbian Cyrillic, and zh-TW needs Traditional rather than plain `zh`.
 */
export const LOCALE_DATA: Record<string, () => Promise<{ default: unknown[] }>> = {
  'af-ZA': () => import('@angular/common/locales/af'),
  'ar-SA': () => import('@angular/common/locales/ar-SA'),
  'ca-ES': () => import('@angular/common/locales/ca'),
  'cs-CZ': () => import('@angular/common/locales/cs'),
  'da-DK': () => import('@angular/common/locales/da'),
  'de-DE': () => import('@angular/common/locales/de'),
  'el-GR': () => import('@angular/common/locales/el'),
  'en-GB': () => import('@angular/common/locales/en-GB'),
  'en-US': () => import('@angular/common/locales/en'),
  'es-ES': () => import('@angular/common/locales/es'),
  'fi-FI': () => import('@angular/common/locales/fi'),
  'fr-FR': () => import('@angular/common/locales/fr'),
  'he-IL': () => import('@angular/common/locales/he'),
  'hu-HU': () => import('@angular/common/locales/hu'),
  'it-IT': () => import('@angular/common/locales/it'),
  'ja-JP': () => import('@angular/common/locales/ja'),
  'ko-KR': () => import('@angular/common/locales/ko'),
  'nl-NL': () => import('@angular/common/locales/nl'),
  'no-NO': () => import('@angular/common/locales/no'),
  'pl-PL': () => import('@angular/common/locales/pl'),
  'pt-BR': () => import('@angular/common/locales/pt'),
  'pt-PT': () => import('@angular/common/locales/pt-PT'),
  'ro-RO': () => import('@angular/common/locales/ro'),
  'ru-RU': () => import('@angular/common/locales/ru'),
  'sr-SP': () => import('@angular/common/locales/sr'),
  'sv-SE': () => import('@angular/common/locales/sv'),
  'tr-TR': () => import('@angular/common/locales/tr'),
  'uk-UA': () => import('@angular/common/locales/uk'),
  'vi-VN': () => import('@angular/common/locales/vi'),
  'zh-CN': () => import('@angular/common/locales/zh'),
  'zh-TW': () => import('@angular/common/locales/zh-Hant'),
};

/**
 * The UI language for this page load: the stored choice, else the first browser language we have
 * (exact match, then by language alone, so `de` or `de-AT` picks de-DE), else en-GB.
 */
export function initialLang(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && AVAILABLE_LANGS.includes(stored)) return stored;
  } catch {
    // Storage unavailable (private mode): fall through to the browser languages.
  }
  const browser = typeof navigator === 'undefined' ? [] : (navigator.languages ?? []);
  for (const tag of browser) {
    const exact = AVAILABLE_LANGS.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const base = tag.split('-')[0].toLowerCase();
    const partial = AVAILABLE_LANGS.find((l) => l.split('-')[0].toLowerCase() === base);
    if (partial) return partial;
  }
  return DEFAULT_LANG;
}

/** Fetches `public/i18n/<lang>.json` at runtime, so one build serves every language. */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}

/** Route `title`s are translation keys; the page title is the translated title plus the app name. */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (key) this.title.setTitle(`${translate(key)} · PostyFox`);
  }
}

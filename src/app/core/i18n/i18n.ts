import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Translation, TranslocoLoader, translate } from '@jsverse/transloco';

/** UI languages with a translation file in `public/i18n/<lang>.json` (issue #33). */
export const AVAILABLE_LANGS = ['en-GB'];
export const DEFAULT_LANG = 'en-GB';

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

import { getLocaleId } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { translocoTesting } from '../../../testing/transloco-testing';
import { AVAILABLE_LANGS, LANGUAGE_STORAGE_KEY, LOCALE_DATA, initialLang } from '../i18n/i18n';
import { LanguageService } from './language.service';

describe('initialLang', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });

  function browser(...languages: string[]) {
    vi.stubGlobal('navigator', { languages });
  }

  it('prefers the stored choice', () => {
    browser('fr-FR');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de-DE');
    expect(initialLang()).toBe('de-DE');
  });

  it('ignores a stored language that no longer exists', () => {
    browser('fr-FR');
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx-XX');
    expect(initialLang()).toBe('fr-FR');
  });

  it('matches browser languages exactly, then by language alone', () => {
    browser('en-US');
    expect(initialLang()).toBe('en-US');
    browser('pt-br');
    expect(initialLang()).toBe('pt-BR');
    browser('de-AT');
    expect(initialLang()).toBe('de-DE');
    browser('xx', 'ja');
    expect(initialLang()).toBe('ja-JP');
  });

  it('falls back to en-GB', () => {
    browser('xx-XX');
    expect(initialLang()).toBe('en-GB');
    browser();
    expect(initialLang()).toBe('en-GB');
  });
});

describe('LanguageService', () => {
  const html = document.documentElement;

  beforeEach(() => TestBed.configureTestingModule({ imports: [translocoTesting()] }));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    html.lang = 'en-GB';
    html.dir = '';
  });

  it('activates the language and sets lang/dir on <html>', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-GB');
    TestBed.inject(LanguageService);
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en-GB');
    expect(html.lang).toBe('en-GB');
    expect(html.dir).toBe('ltr');
  });

  it('sets right-to-left for Arabic and Hebrew', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'he-IL');
    TestBed.inject(LanguageService);
    expect(html.dir).toBe('rtl');
  });

  it('registers locale data under the UI language code', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-GB');
    await TestBed.inject(LanguageService).load();
    expect(getLocaleId('en-GB')).toBe('en-GB');
  });

  it('stores a new choice and reloads, but not for the current language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-GB');
    const service = TestBed.inject(LanguageService);
    const reload = vi.spyOn(service as unknown as { reload: () => void }, 'reload');
    reload.mockImplementation(() => undefined);

    service.setLang('en-GB');
    expect(reload).not.toHaveBeenCalled();

    service.setLang('fr-FR');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr-FR');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('has locale data for every language', async () => {
    expect(Object.keys(LOCALE_DATA).sort()).toEqual([...AVAILABLE_LANGS].sort());
    for (const lang of AVAILABLE_LANGS) {
      expect((await LOCALE_DATA[lang]()).default.length).toBeGreaterThan(0);
    }
  });
});

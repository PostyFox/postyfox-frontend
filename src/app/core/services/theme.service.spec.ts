import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, darkThemeActive } from '../models/theme';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => localStorage.removeItem(THEME_STORAGE_KEY));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(THEME_STORAGE_KEY);
    html.removeAttribute('data-bs-theme');
    darkThemeActive.set(false);
  });

  function create(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('defaults to following the system preference', () => {
    // jsdom has no matchMedia; report a dark OS preference so the assertion is deterministic.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const service = create();

    expect(service.mode()).toBe('system');
    expect(service.isDark()).toBe(true);
    expect(html.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('applies and persists an explicit choice', () => {
    const service = create();

    service.setMode('dark');
    TestBed.tick();
    expect(html.getAttribute('data-bs-theme')).toBe('dark');
    expect(darkThemeActive()).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.setMode('light');
    TestBed.tick();
    expect(html.getAttribute('data-bs-theme')).toBe('light');
    expect(darkThemeActive()).toBe(false);
  });

  it('restores the stored choice, and forgets it when set back to system', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = create();
    expect(service.mode()).toBe('dark');

    service.setMode('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

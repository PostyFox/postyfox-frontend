import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, darkThemeActive } from '../models/theme';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => localStorage.removeItem(THEME_STORAGE_KEY));
  afterEach(() => {
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
    const service = create();

    expect(service.mode()).toBe('system');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(service.isDark()).toBe(systemDark);
    expect(html.getAttribute('data-bs-theme')).toBe(systemDark ? 'dark' : 'light');
  });

  it('applies and persists an explicit choice', () => {
    const service = create();

    service.setMode('dark');
    TestBed.tick();
    expect(html.getAttribute('data-bs-theme')).toBe('dark');
    expect(darkThemeActive()).toBeTrue();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.setMode('light');
    TestBed.tick();
    expect(html.getAttribute('data-bs-theme')).toBe('light');
    expect(darkThemeActive()).toBeFalse();
  });

  it('restores the stored choice, and forgets it when set back to system', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = create();
    expect(service.mode()).toBe('dark');

    service.setMode('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

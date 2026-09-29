import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { THEME_STORAGE_KEY, ThemeMode, darkThemeActive } from '../models/theme';

/**
 * Light/dark mode (issue #422), via Bootstrap 5.3 colour modes: sets `data-bs-theme` on `<html>`.
 * The choice is per-browser. index.html applies the stored choice before Angular boots, so there's
 * no flash of the wrong theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly mode = signal<ThemeMode>(readStoredMode());
  readonly isDark = computed(
    () => this.mode() === 'dark' || (this.mode() === 'system' && this.systemDark()),
  );

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const dark = this.isDark();
      darkThemeActive.set(dark);
      this.document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      if (mode === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (private mode): the choice just won't survive a reload.
    }
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

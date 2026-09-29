import { signal } from '@angular/core';

/** The user's colour-scheme choice (issue #422); `system` follows the OS preference. */
export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'postyfox.theme';

/**
 * Whether dark mode is currently in effect. Owned by ThemeService; lives here so pure helpers such
 * as `brandFor` can pick theme-appropriate colours without depending on a service.
 */
export const darkThemeActive = signal(false);

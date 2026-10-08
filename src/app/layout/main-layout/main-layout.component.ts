import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { LANGUAGES } from '../../core/i18n/i18n';
import { ThemeMode } from '../../core/models/theme';
import { ProfileService } from '../../core/services/profile.service';
import { ThemeService } from '../../core/services/theme.service';
import { VersionService } from '../../core/services/version.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [TranslocoDirective, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private version = inject(VersionService);
  private account = inject(AccountService);
  private profile = inject(ProfileService);
  private theme = inject(ThemeService);
  private language = inject(LanguageService);

  readonly sidebarOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly frontendVersion = this.version.frontend;
  readonly backendVersion = this.version.backend;
  readonly isAdmin = this.auth.isAdmin;

  /** Accounts this session can switch to (issue #409): self plus any accepted memberships. */
  readonly accounts = this.account.accounts;
  readonly activeAccount = this.account.activeAccount;
  /** True once there's actually a choice to make (more than just "yourself" to switch to). */
  readonly canSwitchAccounts = computed(() => this.accounts().length > 1);

  readonly displayName = computed(() => this.activeAccount()?.email ?? this.auth.displayName());
  readonly email = computed(() => this.activeAccount()?.email ?? this.auth.email());
  readonly initials = computed(() => {
    const name = this.displayName();
    const parts = name
      .replace(/[@.].*$/, '')
      .split(/[\s._-]+/)
      .filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
  });

  /**
   * The signed-in user's Gravatar (issue #420). Only shown when acting as yourself: the avatar is
   * always the caller's own, so it would mislabel another account being managed. Initials show until
   * the image has actually loaded, and stay if it 404s (opted out, or no Gravatar registered).
   */
  readonly avatarUrl = this.profile.avatarUrl;
  private readonly loadedAvatarUrl = signal<string | null>(null);
  readonly avatarLoaded = computed(
    () => !this.activeAccount() && this.loadedAvatarUrl() === this.avatarUrl(),
  );

  /** Colour theme (issue #422). Labels are translation keys. */
  readonly themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'mainLayout.themeLight', icon: 'bi-sun' },
    { mode: 'dark', label: 'mainLayout.themeDark', icon: 'bi-moon-stars' },
    { mode: 'system', label: 'mainLayout.themeSystem', icon: 'bi-circle-half' },
  ];
  readonly themeMode = this.theme.mode;
  readonly isDark = this.theme.isDark;
  readonly currentTheme = computed(() => this.themes.find((t) => t.mode === this.themeMode()));
  readonly themeIcon = computed(() => this.currentTheme()?.icon ?? 'bi-circle-half');

  /** UI language (issue #33). */
  readonly languages = LANGUAGES;
  readonly lang = this.language.lang;
  readonly langName = LANGUAGES.find((l) => l.code === this.lang)?.name ?? this.lang;

  /** `label`s are translation keys. */
  readonly nav: NavItem[] = [
    { label: 'nav.dashboard', icon: 'bi-grid-1x2', link: '/dashboard' },
    { label: 'nav.compose', icon: 'bi-pencil-square', link: '/compose' },
    { label: 'nav.posts', icon: 'bi-collection', link: '/posts' },
    { label: 'nav.connectors', icon: 'bi-plug', link: '/connectors' },
    { label: 'nav.templates', icon: 'bi-file-earmark-text', link: '/templates' },
    { label: 'nav.tagPresets', icon: 'bi-tags', link: '/tag-presets' },
    { label: 'nav.textTemplates', icon: 'bi-braces', link: '/text-templates' },
    { label: 'nav.triggers', icon: 'bi-lightning-charge', link: '/triggers' },
    { label: 'nav.apiKeys', icon: 'bi-key', link: '/keys' },
    { label: 'nav.access', icon: 'bi-people', link: '/access' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  setLang(lang: string): void {
    this.language.setLang(lang);
  }

  onAvatarLoad(url: string): void {
    this.loadedAvatarUrl.set(url);
  }

  signOut(): void {
    this.auth.signOut();
  }

  switchAccount(userId: string | null): void {
    this.account.switchTo(userId);
  }
}

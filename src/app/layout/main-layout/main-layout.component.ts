import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { VersionService } from '../../core/services/version.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private version = inject(VersionService);
  private account = inject(AccountService);

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

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-grid-1x2', link: '/dashboard' },
    { label: 'Compose', icon: 'bi-pencil-square', link: '/compose' },
    { label: 'Posts', icon: 'bi-collection', link: '/posts' },
    { label: 'Connectors', icon: 'bi-plug', link: '/connectors' },
    { label: 'Templates', icon: 'bi-file-earmark-text', link: '/templates' },
    { label: 'Tag presets', icon: 'bi-tags', link: '/tag-presets' },
    { label: 'Text templates', icon: 'bi-braces', link: '/text-templates' },
    { label: 'Triggers', icon: 'bi-lightning-charge', link: '/triggers' },
    { label: 'API keys', icon: 'bi-key', link: '/keys' },
    { label: 'Access', icon: 'bi-people', link: '/access' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  signOut(): void {
    this.auth.signOut();
  }

  switchAccount(userId: string | null): void {
    this.account.switchTo(userId);
  }
}

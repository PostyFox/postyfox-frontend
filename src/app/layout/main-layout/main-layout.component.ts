import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

  readonly sidebarOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly frontendVersion = this.version.frontend;
  readonly backendVersion = this.version.backend;
  readonly displayName = this.auth.displayName;
  readonly email = this.auth.email;
  readonly isAdmin = this.auth.isAdmin;
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
    { label: 'Triggers', icon: 'bi-lightning-charge', link: '/triggers' },
    { label: 'API keys', icon: 'bi-key', link: '/keys' },
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
}

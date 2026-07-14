import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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

  readonly sidebarOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly displayName = this.auth.displayName;
  readonly email = this.auth.email;
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

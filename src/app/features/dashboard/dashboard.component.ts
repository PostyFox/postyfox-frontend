import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin, switchMap, timer } from 'rxjs';
import { PostSummary, UserConnector } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import { ROOT_STATUS_META } from '../../core/models/status.util';
import { ConnectorsService } from '../../core/services/connectors.service';
import { PostsService } from '../../core/services/posts.service';
import { TemplatesService } from '../../core/services/templates.service';
import { TriggersService } from '../../core/services/triggers.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface Tile {
  label: string;
  value: number;
  icon: string;
  color: string;
  link: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeaderComponent, StatusBadgeComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnDestroy {
  private connectors = inject(ConnectorsService);
  private templates = inject(TemplatesService);
  private triggers = inject(TriggersService);
  private posts = inject(PostsService);
  private auth = inject(AuthService);
  private activeSub?: Subscription;

  readonly loading = signal(true);
  readonly connectorList = signal<UserConnector[]>([]);
  readonly templateCount = signal(0);
  readonly triggerCount = signal(0);
  readonly activePosts = signal<PostSummary[]>([]);
  readonly displayName = this.auth.displayName;
  brand = brandFor;

  rootMeta(p: PostSummary) {
    return ROOT_STATUS_META[p.rootStatus];
  }

  readonly enabledConnectors = computed(() => this.connectorList().filter((c) => c.enabled).length);

  readonly tiles = computed<Tile[]>(() => [
    {
      label: 'Connectors',
      value: this.connectorList().length,
      icon: 'bi-plug',
      color: 'primary',
      link: '/connectors',
    },
    {
      label: 'Templates',
      value: this.templateCount(),
      icon: 'bi-file-earmark-text',
      color: 'info',
      link: '/templates',
    },
    {
      label: 'Triggers',
      value: this.triggerCount(),
      icon: 'bi-lightning-charge',
      color: 'warning',
      link: '/triggers',
    },
    {
      label: 'Enabled',
      value: this.enabledConnectors(),
      icon: 'bi-check-circle',
      color: 'success',
      link: '/connectors',
    },
  ]);

  constructor() {
    forkJoin({
      connectors: this.connectors.list(),
      templates: this.templates.list(),
      triggers: this.triggers.list(),
    }).subscribe({
      next: ({ connectors, templates, triggers }) => {
        this.connectorList.set(connectors);
        this.templateCount.set(templates.length);
        this.triggerCount.set(triggers.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // Keep the "active posts" widget live so in-flight work is visible on landing.
    this.activeSub = timer(0, 5000)
      .pipe(switchMap(() => this.posts.list('active', 5)))
      .subscribe({
        next: (rows) => this.activePosts.set(rows),
        error: () => this.activePosts.set([]),
      });
  }

  ngOnDestroy(): void {
    this.activeSub?.unsubscribe();
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserConnector } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import { ConnectorsService } from '../../core/services/connectors.service';
import { TemplatesService } from '../../core/services/templates.service';
import { TriggersService } from '../../core/services/triggers.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface Tile {
  label: string;
  value: number;
  icon: string;
  color: string;
  link: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private connectors = inject(ConnectorsService);
  private templates = inject(TemplatesService);
  private triggers = inject(TriggersService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly connectorList = signal<UserConnector[]>([]);
  readonly templateCount = signal(0);
  readonly triggerCount = signal(0);
  readonly displayName = this.auth.displayName;
  brand = brandFor;

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
  }
}

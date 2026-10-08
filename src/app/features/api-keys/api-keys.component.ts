import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { ApiKey, ApiKeyCreated } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-api-keys',
  imports: [TranslocoDirective, FormsModule, DatePipe, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './api-keys.component.html',
})
export class ApiKeysComponent {
  private profile = inject(ProfileService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly keys = signal<ApiKey[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly newName = signal('');
  /** The just-created key (plaintext shown once). */
  readonly created = signal<ApiKeyCreated | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.profile.listKeys().subscribe({
      next: (k) => {
        this.keys.set(k);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(translate('apiKeys.couldNotLoadApi'));
        this.loading.set(false);
      },
    });
  }

  create(): void {
    this.creating.set(true);
    const name = this.newName().trim();
    this.profile.createKey({ name: name || null }).subscribe({
      next: (k) => {
        this.created.set(k);
        this.newName.set('');
        this.creating.set(false);
        this.load();
      },
      error: () => {
        this.toast.error(translate('apiKeys.couldNotCreateApi'));
        this.creating.set(false);
      },
    });
  }

  async revoke(key: ApiKey): Promise<void> {
    const ok = await this.confirm.ask({
      title: translate('apiKeys.revokeApiKey'),
      message: translate('apiKeys.revokeKeyAnyIntegrations', { prefix: key.name || key.prefix }),
      confirmText: translate('apiKeys.revoke'),
      kind: 'danger',
    });
    if (!ok) return;
    this.profile.revokeKey(key.id).subscribe({
      next: () => {
        this.toast.success(translate('apiKeys.apiKeyRevoked'));
        this.load();
      },
      error: () => this.toast.error(translate('apiKeys.couldNotRevokeKey')),
    });
  }

  copy(value: string): void {
    navigator.clipboard?.writeText(value).then(
      () => this.toast.success(translate('apiKeys.copiedClipboard')),
      () =>
        this.toast.warning(
          translate('apiKeys.copyFailed'),
          translate('apiKeys.selectCopyManually'),
        ),
    );
  }

  dismissCreated(): void {
    this.created.set(null);
  }
}

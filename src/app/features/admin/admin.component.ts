import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationalSecret } from '../../core/models/api.models';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface SecretGroup {
  component: string;
  secrets: OperationalSecret[];
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private admin = inject(AdminService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly secrets = signal<OperationalSecret[]>([]);
  readonly values = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly saving = signal<string | null>(null);
  readonly groups = computed<SecretGroup[]>(() => {
    const groups = new Map<string, OperationalSecret[]>();
    for (const secret of this.secrets()) {
      groups.set(secret.component, [...(groups.get(secret.component) ?? []), secret]);
    }
    return [...groups].map(([component, secrets]) => ({ component, secrets }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.listOperationalSecrets().subscribe({
      next: (secrets) => {
        this.secrets.set(secrets);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load operational secrets');
        this.loading.set(false);
      },
    });
  }

  setValue(key: string, value: string): void {
    this.values.update((values) => ({ ...values, [key]: value }));
  }

  save(secret: OperationalSecret): void {
    const value = this.values()[secret.key] ?? '';
    if (!value.trim()) return;
    this.saving.set(secret.key);
    this.admin.setOperationalSecret(secret.key, value).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.setValue(secret.key, '');
        this.saving.set(null);
        this.toast.success(`${secret.component} ${secret.displayName} saved`);
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(`Could not save ${secret.displayName}`);
      },
    });
  }

  async remove(secret: OperationalSecret): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Delete operational secret',
      message: `Delete ${secret.component} ${secret.displayName}? The connector may stop operating immediately.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!confirmed) return;

    this.saving.set(secret.key);
    this.admin.deleteOperationalSecret(secret.key).subscribe({
      next: () => {
        this.replace({ ...secret, configured: false });
        this.saving.set(null);
        this.toast.success(`${secret.component} ${secret.displayName} deleted`);
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(`Could not delete ${secret.displayName}`);
      },
    });
  }

  private replace(updated: OperationalSecret): void {
    this.secrets.update((secrets) =>
      secrets.map((secret) => (secret.key === updated.key ? updated : secret)),
    );
  }
}

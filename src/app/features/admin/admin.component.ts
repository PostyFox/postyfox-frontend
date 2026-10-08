import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { MarkdownComponent } from 'ngx-markdown';
import { OperationalSecret, PairedUserAgentSetting } from '../../core/models/api.models';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { TermsService } from '../../core/services/terms.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface SecretGroup {
  component: string;
  secrets: OperationalSecret[];
}

@Component({
  selector: 'app-admin',
  imports: [TranslocoDirective, FormsModule, MarkdownComponent, PageHeaderComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private admin = inject(AdminService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private terms = inject(TermsService);
  private router = inject(Router);

  readonly secrets = signal<OperationalSecret[]>([]);
  readonly userAgents = signal<PairedUserAgentSetting[]>([]);
  readonly values = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly saving = signal<string | null>(null);
  readonly termsContent = signal('');
  readonly termsPublished = signal(false);
  readonly termsPreview = signal(false);
  readonly groups = computed<SecretGroup[]>(() => {
    const groups = new Map<string, OperationalSecret[]>();
    for (const secret of this.secrets()) {
      groups.set(secret.component, [...(groups.get(secret.component) ?? []), secret]);
    }
    return [...groups].map(([component, secrets]) => ({ component, secrets }));
  });

  constructor() {
    this.load();
    this.loadUserAgents();
    this.loadTerms();
  }

  loadTerms(): void {
    this.terms.load().subscribe({
      next: (status) => {
        this.termsContent.set(status.current?.content ?? '');
        this.termsPublished.set(!!status.current);
      },
      error: () => this.toast.error(translate('admin.couldNotLoadTerms')),
    });
  }

  async publishTerms(turnOff = false): Promise<void> {
    const confirmed = await this.confirm.ask(
      turnOff
        ? {
            title: translate('admin.turnOffTermsTitle'),
            message: translate('admin.turnOffTermsMessage'),
            confirmText: translate('admin.turnOff'),
            kind: 'danger',
          }
        : {
            title: translate('admin.publishTermsTitle'),
            message: translate('admin.publishTermsMessage'),
            confirmText: translate('admin.publish'),
          },
    );
    if (!confirmed) return;

    this.saving.set('terms');
    this.terms.publish(turnOff ? '' : this.termsContent()).subscribe({
      next: (published) => {
        this.saving.set(null);
        if (published) {
          this.toast.success(translate('admin.termsServicePublished'));
          this.terms.load().subscribe(() => this.router.navigateByUrl('/terms'));
        } else {
          this.termsContent.set('');
          this.termsPublished.set(false);
          this.toast.success(translate('admin.termsServiceTurnedOff'));
        }
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(translate('admin.couldNotSaveTerms'));
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.admin.listOperationalSecrets().subscribe({
      next: (secrets) => {
        this.secrets.set(secrets);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(translate('admin.couldNotLoadOperational'));
        this.loading.set(false);
      },
    });
  }

  loadUserAgents(): void {
    this.admin.listPairedUserAgents().subscribe({
      next: (settings) => this.userAgents.set(settings),
      error: () => this.toast.error(translate('admin.couldNotLoadUser')),
    });
  }

  setUserAgent(setting: PairedUserAgentSetting, usePairedUserAgent: boolean): void {
    this.saving.set(setting.platform);
    this.admin.setPairedUserAgent(setting.platform, usePairedUserAgent).subscribe({
      next: (updated) => {
        this.userAgents.update((all) =>
          all.map((s) => (s.platform === updated.platform ? updated : s)),
        );
        this.saving.set(null);
        this.toast.success(translate('admin.saved', { name: updated.name }));
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(translate('admin.couldNotSave', { name: setting.name }));
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
        this.toast.success(
          translate('admin.saved2', {
            component: secret.component,
            displayName: secret.displayName,
          }),
        );
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(translate('admin.couldNotSave2', { displayName: secret.displayName }));
      },
    });
  }

  async remove(secret: OperationalSecret): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: translate('admin.deleteOperationalSecret'),
      message: translate('admin.deleteConnectorMayStop', {
        component: secret.component,
        displayName: secret.displayName,
      }),
      confirmText: translate('admin.delete'),
      kind: 'danger',
    });
    if (!confirmed) return;

    this.saving.set(secret.key);
    this.admin.deleteOperationalSecret(secret.key).subscribe({
      next: () => {
        this.replace({ ...secret, configured: false });
        this.saving.set(null);
        this.toast.success(
          translate('admin.deleted', {
            component: secret.component,
            displayName: secret.displayName,
          }),
        );
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(translate('admin.couldNotDelete', { displayName: secret.displayName }));
      },
    });
  }

  private replace(updated: OperationalSecret): void {
    this.secrets.update((secrets) =>
      secrets.map((secret) => (secret.key === updated.key ? updated : secret)),
    );
  }
}

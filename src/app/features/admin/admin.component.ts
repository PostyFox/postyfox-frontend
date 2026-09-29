import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imports: [FormsModule, MarkdownComponent, PageHeaderComponent],
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
      error: () => this.toast.error('Could not load the terms of service'),
    });
  }

  async publishTerms(turnOff = false): Promise<void> {
    const confirmed = await this.confirm.ask(
      turnOff
        ? {
            title: 'Turn off terms of service',
            message: 'Users will no longer need to accept terms to use PostyFox.',
            confirmText: 'Turn off',
            kind: 'danger',
          }
        : {
            title: 'Publish terms of service',
            message:
              'Every user, including you, will have to accept these terms before they can use PostyFox again, through the site or the API.',
            confirmText: 'Publish',
          },
    );
    if (!confirmed) return;

    this.saving.set('terms');
    this.terms.publish(turnOff ? '' : this.termsContent()).subscribe({
      next: (published) => {
        this.saving.set(null);
        if (published) {
          this.toast.success('Terms of service published');
          this.terms.load().subscribe(() => this.router.navigateByUrl('/terms'));
        } else {
          this.termsContent.set('');
          this.termsPublished.set(false);
          this.toast.success('Terms of service turned off');
        }
      },
      error: () => {
        this.saving.set(null);
        this.toast.error('Could not save the terms of service');
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
        this.toast.error('Could not load operational secrets');
        this.loading.set(false);
      },
    });
  }

  loadUserAgents(): void {
    this.admin.listPairedUserAgents().subscribe({
      next: (settings) => this.userAgents.set(settings),
      error: () => this.toast.error('Could not load User-Agent settings'),
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
        this.toast.success(`${updated.name} saved`);
      },
      error: () => {
        this.saving.set(null);
        this.toast.error(`Could not save ${setting.name}`);
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

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Template, Trigger, UserConnector } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ConnectorsService } from '../../core/services/connectors.service';
import { TemplatesService } from '../../core/services/templates.service';
import { ToastService } from '../../core/services/toast.service';
import { TriggersService } from '../../core/services/triggers.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface FormModel {
  sourceType: string;
  externalAccount: string;
  targetConnectorId: string;
  templateId: string;
  notifyFrequencyHrs: number;
}

const EMPTY_FORM: FormModel = {
  sourceType: 'generic',
  externalAccount: '',
  targetConnectorId: '',
  templateId: '',
  notifyFrequencyHrs: 24,
};

@Component({
  selector: 'app-triggers',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './triggers.component.html',
})
export class TriggersComponent {
  private triggers = inject(TriggersService);
  private connectors = inject(ConnectorsService);
  private templates = inject(TemplatesService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly list = signal<Trigger[]>([]);
  readonly connectorList = signal<UserConnector[]>([]);
  readonly templateList = signal<Template[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly form = signal<FormModel>({ ...EMPTY_FORM });

  readonly sourceTypes = ['generic'];
  readonly enabledConnectors = computed(() => this.connectorList().filter((c) => c.enabled));

  connectorName(id: string | null): string {
    if (!id) return '—';
    return this.connectorList().find((c) => c.id === id)?.displayName ?? id;
  }

  templateName(id: string | null): string {
    if (!id) return 'None';
    return this.templateList().find((t) => t.id === id)?.title ?? id;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      triggers: this.triggers.list(),
      connectors: this.connectors.list(),
      templates: this.templates.list(),
    }).subscribe({
      next: ({ triggers, connectors, templates }) => {
        this.list.set(triggers);
        this.connectorList.set(connectors);
        this.templateList.set(templates);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load triggers');
        this.loading.set(false);
      },
    });
  }

  openForm(): void {
    this.form.set({ ...EMPTY_FORM });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  patch<K extends keyof FormModel>(field: K, value: FormModel[K]): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  save(): void {
    const f = this.form();
    if (!f.externalAccount.trim() || !f.targetConnectorId) {
      this.toast.warning('Missing fields', 'Choose a target connector and enter an account.');
      return;
    }
    this.saving.set(true);
    this.triggers
      .register({
        sourceType: f.sourceType,
        externalAccount: f.externalAccount.trim(),
        targetConnectorId: f.targetConnectorId,
        templateId: f.templateId || null,
        notifyFrequencyHrs: Number(f.notifyFrequencyHrs) || 0,
      })
      .subscribe({
        next: () => {
          this.toast.success('Trigger registered');
          this.saving.set(false);
          this.closeForm();
          this.load();
        },
        error: (err) => {
          this.toast.error('Could not register trigger', err?.error?.error);
          this.saving.set(false);
        },
      });
  }

  async remove(t: Trigger): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete trigger',
      message: `Delete the ${t.sourceType} trigger for “${t.externalAccount}”?`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.triggers.delete(t.id).subscribe({
      next: () => {
        this.toast.success('Trigger deleted');
        this.load();
      },
      error: () => this.toast.error('Could not delete trigger'),
    });
  }
}

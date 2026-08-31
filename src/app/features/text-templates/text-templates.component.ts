import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextTemplate, UserConnector } from '../../core/models/api.models';
import { brandFor } from '../../core/models/platforms';
import { ConfirmService } from '../../core/services/confirm.service';
import { ConnectorsService } from '../../core/services/connectors.service';
import { TextTemplatesService } from '../../core/services/text-templates.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface EditModel {
  id: string | null;
  name: string;
  defaultValue: string;
  /** Keyed by connector id; a row absent or blank here means "use the default value". */
  connectorValues: Record<string, string>;
}

@Component({
  selector: 'app-text-templates',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './text-templates.component.html',
})
export class TextTemplatesComponent {
  private textTemplates = inject(TextTemplatesService);
  private connectors = inject(ConnectorsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  brand = brandFor;

  readonly list = signal<TextTemplate[]>([]);
  readonly connectorList = signal<UserConnector[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly edit = signal<EditModel | null>(null);

  /** Connectors shown as override rows in the editor — enabled ones the author can actually post to. */
  readonly enabledConnectors = computed(() => this.connectorList().filter((c) => c.enabled));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.textTemplates.list().subscribe({
      next: (t) => {
        this.list.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load text templates');
        this.loading.set(false);
      },
    });
    this.connectors.list().subscribe({ next: (c) => this.connectorList.set(c) });
  }

  /** How many connectors have an override set, for the list row summary. */
  overrideCount(t: TextTemplate): number {
    return Object.values(t.connectorValues).filter((v) => v.trim().length > 0).length;
  }

  newTemplate(): void {
    this.edit.set({ id: null, name: '', defaultValue: '', connectorValues: {} });
  }

  openEdit(t: TextTemplate): void {
    this.edit.set({
      id: t.id,
      name: t.name,
      defaultValue: t.defaultValue,
      connectorValues: { ...t.connectorValues },
    });
  }

  patchName(value: string): void {
    const e = this.edit();
    if (e) this.edit.set({ ...e, name: value });
  }

  patchDefaultValue(value: string): void {
    const e = this.edit();
    if (e) this.edit.set({ ...e, defaultValue: value });
  }

  connectorOverride(connectorId: string): string {
    return this.edit()?.connectorValues[connectorId] ?? '';
  }

  patchConnectorOverride(connectorId: string, value: string): void {
    const e = this.edit();
    if (e) this.edit.set({ ...e, connectorValues: { ...e.connectorValues, [connectorId]: value } });
  }

  close(): void {
    this.edit.set(null);
  }

  save(): void {
    const e = this.edit();
    if (!e || !e.name.trim()) return;
    // Drop blanks — an empty override means "use the default", same as never having set one.
    const connectorValues = Object.fromEntries(
      Object.entries(e.connectorValues).filter(([, v]) => v.trim().length > 0),
    );
    this.saving.set(true);
    this.textTemplates
      .upsert({ id: e.id, name: e.name.trim(), defaultValue: e.defaultValue, connectorValues })
      .subscribe({
        next: () => {
          this.toast.success(e.id ? 'Text template updated' : 'Text template created');
          this.saving.set(false);
          this.close();
          this.load();
        },
        error: (err) => {
          this.toast.error('Could not save text template', err?.error?.error);
          this.saving.set(false);
        },
      });
  }

  async remove(t: TextTemplate): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete text template',
      message: `Delete “${t.name}”? Any {{tt:${t.name}}} references left in posts will resolve to blank. This cannot be undone.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.textTemplates.delete(t.id).subscribe({
      next: () => {
        this.toast.success('Text template deleted');
        this.load();
      },
      error: () => this.toast.error('Could not delete text template'),
    });
  }
}

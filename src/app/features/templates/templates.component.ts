import { SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { Template } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { TemplatesService } from '../../core/services/templates.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface EditModel {
  id: string | null;
  title: string;
  markdownBody: string;
}

@Component({
  selector: 'app-templates',
  imports: [FormsModule, SlicePipe, MarkdownComponent, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './templates.component.html',
})
export class TemplatesComponent {
  private templates = inject(TemplatesService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly list = signal<Template[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly edit = signal<EditModel | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.templates.list().subscribe({
      next: (t) => {
        this.list.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load templates');
        this.loading.set(false);
      },
    });
  }

  newTemplate(): void {
    this.edit.set({ id: null, title: '', markdownBody: '' });
  }

  openEdit(t: Template): void {
    this.edit.set({ id: t.id, title: t.title, markdownBody: t.markdownBody });
  }

  patch(field: keyof EditModel, value: string): void {
    const e = this.edit();
    if (e) this.edit.set({ ...e, [field]: value });
  }

  close(): void {
    this.edit.set(null);
  }

  save(): void {
    const e = this.edit();
    if (!e || !e.title.trim()) return;
    this.saving.set(true);
    this.templates
      .upsert({ id: e.id, title: e.title.trim(), markdownBody: e.markdownBody })
      .subscribe({
        next: () => {
          this.toast.success(e.id ? 'Template updated' : 'Template created');
          this.saving.set(false);
          this.close();
          this.load();
        },
        error: () => {
          this.toast.error('Could not save template');
          this.saving.set(false);
        },
      });
  }

  async remove(t: Template): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete template',
      message: `Delete “${t.title}”? This cannot be undone.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.templates.delete(t.id).subscribe({
      next: () => {
        this.toast.success('Template deleted');
        this.load();
      },
      error: () => this.toast.error('Could not delete template'),
    });
  }
}

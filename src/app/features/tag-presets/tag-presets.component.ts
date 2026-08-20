import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TagPreset } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { TagPresetsService } from '../../core/services/tag-presets.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface EditModel {
  id: string | null;
  name: string;
  tagsText: string;
}

/** Parses a comma-separated tags input the same way the compose form does. */
function parseTags(tagsText: string): string[] {
  return tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

@Component({
  selector: 'app-tag-presets',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './tag-presets.component.html',
})
export class TagPresetsComponent {
  private tagPresets = inject(TagPresetsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly list = signal<TagPreset[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly edit = signal<EditModel | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.tagPresets.list().subscribe({
      next: (t) => {
        this.list.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load tag presets');
        this.loading.set(false);
      },
    });
  }

  newPreset(): void {
    this.edit.set({ id: null, name: '', tagsText: '' });
  }

  openEdit(p: TagPreset): void {
    this.edit.set({ id: p.id, name: p.name, tagsText: p.tags.join(', ') });
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
    if (!e || !e.name.trim()) return;
    const tags = parseTags(e.tagsText);
    this.saving.set(true);
    this.tagPresets.upsert({ id: e.id, name: e.name.trim(), tags }).subscribe({
      next: () => {
        this.toast.success(e.id ? 'Tag preset updated' : 'Tag preset created');
        this.saving.set(false);
        this.close();
        this.load();
      },
      error: () => {
        this.toast.error('Could not save tag preset');
        this.saving.set(false);
      },
    });
  }

  async remove(p: TagPreset): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete tag preset',
      message: `Delete “${p.name}”? This cannot be undone.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.tagPresets.delete(p.id).subscribe({
      next: () => {
        this.toast.success('Tag preset deleted');
        this.load();
      },
      error: () => this.toast.error('Could not delete tag preset'),
    });
  }
}

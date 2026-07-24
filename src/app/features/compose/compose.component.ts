import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CreatePostRequest,
  MediaCheckResultItem,
  MediaRef,
  PostContent,
  ServiceDefinition,
  Template,
  UserConnector,
} from '../../core/models/api.models';
import { brandFor, capabilitiesByPlatform } from '../../core/models/platforms';
import { ConnectorsService } from '../../core/services/connectors.service';
import { MediaService } from '../../core/services/media.service';
import { PostsService } from '../../core/services/posts.service';
import { ServicesService } from '../../core/services/services.service';
import { TemplatesService } from '../../core/services/templates.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface MediaItem {
  ref: MediaRef;
  name: string;
  alt: string;
  /** Original file size in bytes (undefined for media restored from prefill history). */
  fileSize?: number;
  /** MIME type of the original file (undefined for media restored from prefill history). */
  mimeType?: string;
  /** Per-connector resize analysis from the media-check endpoint; populated after upload. */
  resizeChecks?: MediaCheckResultItem[];
}

interface Variable {
  key: string;
  value: string;
}

@Component({
  selector: 'app-compose',
  imports: [FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './compose.component.html',
})
export class ComposeComponent {
  private connectors = inject(ConnectorsService);
  private templates = inject(TemplatesService);
  private services = inject(ServicesService);
  private posts = inject(PostsService);
  private media = inject(MediaService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly connectorList = signal<UserConnector[]>([]);
  readonly templateList = signal<Template[]>([]);
  readonly catalogue = signal<ServiceDefinition[]>([]);
  brand = brandFor;
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly uploading = signal(false);

  // form state
  readonly selectedTargets = signal<Set<string>>(new Set());
  readonly title = signal('');
  readonly description = signal('');
  readonly tags = signal('');
  readonly templateId = signal('');
  readonly variables = signal<Variable[]>([]);
  readonly mediaItems = signal<MediaItem[]>([]);
  readonly scheduleEnabled = signal(false);
  readonly postAt = signal('');

  readonly enabledConnectors = computed(() => this.connectorList().filter((c) => c.enabled));
  readonly capsByPlatform = computed(() => capabilitiesByPlatform(this.catalogue()));

  readonly selectedConnectors = computed(() =>
    this.enabledConnectors().filter((c) => this.selectedTargets().has(c.id)),
  );

  /** Tightest character limit across selected targets (null → no limit applies). */
  readonly effectiveMaxLength = computed<number | null>(() => {
    const caps = this.capsByPlatform();
    const limits = this.selectedConnectors()
      .map((c) => caps[c.platform]?.maxContentLength)
      .filter((n): n is number => typeof n === 'number');
    return limits.length ? Math.min(...limits) : null;
  });

  readonly descriptionLength = computed(() => this.description().length);
  readonly overLimit = computed(() => {
    const max = this.effectiveMaxLength();
    return max != null && this.descriptionLength() > max;
  });

  /** Selected targets that will drop attached media (platform doesn't support it). */
  readonly mediaUnsupportedTargets = computed(() => {
    if (this.mediaItems().length === 0) return [];
    const caps = this.capsByPlatform();
    return this.selectedConnectors().filter(
      (c) => caps[c.platform] && !caps[c.platform].supportsMedia,
    );
  });

  /** Selected targets that will resize at least one attached media item before delivery. */
  readonly mediaResizeTargets = computed(() => {
    const items = this.mediaItems();
    if (items.length === 0) return [];
    const selectedIds = new Set(this.selectedConnectors().map((c) => c.id));
    const resizingIds = new Set<string>();
    for (const item of items) {
      for (const check of item.resizeChecks ?? []) {
        if (selectedIds.has(check.connectorId) && check.willResize) {
          resizingIds.add(check.connectorId);
        }
      }
    }
    return this.selectedConnectors().filter((c) => resizingIds.has(c.id));
  });

  /** Selected targets that ignore the title (platform doesn't support one). */
  readonly titleIgnoredTargets = computed(() => {
    if (!this.title().trim()) return [];
    const caps = this.capsByPlatform();
    return this.selectedConnectors().filter(
      (c) => caps[c.platform] && !caps[c.platform].supportsTitle,
    );
  });

  readonly canSubmit = computed(
    () => this.selectedTargets().size > 0 && !this.submitting() && !this.uploading(),
  );

  constructor() {
    // "Post again" from history hands us the original content via router state.
    const prefill = (this.router.getCurrentNavigation()?.extras.state ??
      (typeof history !== 'undefined' ? history.state : null))?.['prefill'] as
      PostContent | undefined;

    forkJoin({
      connectors: this.connectors.list(),
      templates: this.templates.list(),
      catalogue: this.services.list(),
    }).subscribe({
      next: ({ connectors, templates, catalogue }) => {
        this.connectorList.set(connectors);
        this.templateList.set(templates);
        this.catalogue.set(catalogue);
        this.loading.set(false);
        if (prefill) this.applyPrefill(prefill, connectors);
      },
      error: () => {
        this.toast.error('Could not load compose data');
        this.loading.set(false);
      },
    });
  }

  /** Re-seeds the form from a past post. Only re-ticks targets that still exist and are enabled. */
  private applyPrefill(content: PostContent, connectors: UserConnector[]): void {
    const available = new Set(connectors.filter((c) => c.enabled).map((c) => c.id));
    this.selectedTargets.set(new Set(content.connectorIds.filter((id) => available.has(id))));
    this.title.set(content.title ?? '');
    this.description.set(content.description ?? '');
    this.tags.set(content.tags.join(', '));
    this.templateId.set(content.templateId ?? '');
    this.variables.set(Object.entries(content.variables).map(([key, value]) => ({ key, value })));
    this.mediaItems.set(
      content.media.map((ref) => ({
        ref,
        name: ref.key.split('/').pop() ?? ref.key,
        alt: ref.alt ?? '',
      })),
    );
    // Deliberately not carrying the old schedule time across — it's almost certainly in the past.
  }

  /** Comma-joined display names, for capability warnings. */
  names(connectors: UserConnector[]): string {
    return connectors.map((c) => c.displayName).join(', ');
  }

  isSelected(id: string): boolean {
    return this.selectedTargets().has(id);
  }

  toggleTarget(id: string): void {
    this.selectedTargets.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ----- variables ----------------------------------------------------------
  addVariable(): void {
    this.variables.update((v) => [...v, { key: '', value: '' }]);
  }

  patchVariable(i: number, field: keyof Variable, value: string): void {
    this.variables.update((v) => v.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  }

  removeVariable(i: number): void {
    this.variables.update((v) => v.filter((_, idx) => idx !== i));
  }

  // ----- media --------------------------------------------------------------
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    this.uploading.set(true);
    let remaining = files.length;
    for (const file of files) {
      this.media.upload(file).subscribe({
        next: (ref) => {
          const item: MediaItem = {
            ref,
            name: file.name,
            alt: '',
            fileSize: file.size,
            mimeType: file.type,
          };
          this.mediaItems.update((m) => [...m, item]);

          // Pre-flight check: find which enabled connectors would resize this file.
          const connectorIds = this.enabledConnectors().map((c) => c.id);
          if (connectorIds.length > 0) {
            this.connectors
              .checkMedia({ connectorIds, fileSize: file.size, mimeType: file.type })
              .subscribe({
                next: (checks) => {
                  this.mediaItems.update((items) =>
                    items.map((m) => (m.ref.key === ref.key ? { ...m, resizeChecks: checks } : m)),
                  );
                },
                error: () => {
                  /* resize check is best-effort; silently ignore failures */
                },
              });
          }

          if (--remaining === 0) this.uploading.set(false);
        },
        error: () => {
          this.toast.error('Upload failed', file.name);
          if (--remaining === 0) this.uploading.set(false);
        },
      });
    }
    input.value = '';
  }

  /** Returns the names of selected connectors that will resize the given media item. */
  resizeLabelsFor(item: MediaItem): string {
    if (!item.resizeChecks?.length) return '';
    const selectedIds = new Set(this.selectedConnectors().map((c) => c.id));
    return item.resizeChecks
      .filter((c) => c.willResize && selectedIds.has(c.connectorId))
      .map((c) => c.displayName)
      .join(', ');
  }

  patchAlt(i: number, value: string): void {
    this.mediaItems.update((m) => m.map((x, idx) => (idx === i ? { ...x, alt: value } : x)));
  }

  removeMedia(i: number): void {
    this.mediaItems.update((m) => m.filter((_, idx) => idx !== i));
  }

  // ----- submit -------------------------------------------------------------
  submit(): void {
    const targets = [...this.selectedTargets()];
    if (targets.length === 0) {
      this.toast.warning('Pick at least one target');
      return;
    }

    const tags = this.tags()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const vars = this.variables().filter((v) => v.key.trim());
    const variables = vars.length
      ? Object.fromEntries(vars.map((v) => [v.key.trim(), v.value]))
      : null;

    const media: MediaRef[] = this.mediaItems().map((m) => ({
      ...m.ref,
      alt: m.alt.trim() || null,
    }));

    let postAt: string | null = null;
    if (this.scheduleEnabled() && this.postAt()) {
      postAt = new Date(this.postAt()).toISOString();
    }

    const body: CreatePostRequest = {
      targets,
      title: this.title().trim() || null,
      description: this.description().trim() || null,
      htmlDescription: null,
      tags: tags.length ? tags : null,
      media: media.length ? media : null,
      templateId: this.templateId() || null,
      variables,
      postAt,
    };

    this.submitting.set(true);
    this.posts.create(body).subscribe({
      next: (res) => {
        this.toast.success(postAt ? 'Post scheduled' : 'Post queued');
        this.router.navigate(['/posts', res.postId]);
      },
      error: (err) => {
        this.toast.error('Could not create post', err?.error?.error);
        this.submitting.set(false);
      },
    });
  }
}

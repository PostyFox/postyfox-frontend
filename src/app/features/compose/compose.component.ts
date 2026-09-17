import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  AutomationAction,
  AutomationRequest,
  CreatePostRequest,
  ConnectorDestinationSummary,
  ContentRating,
  MediaCheckResultItem,
  MediaLimits,
  MediaRef,
  PostContent,
  ServiceDefinition,
  TagPreset,
  Template,
  TextTemplate,
  UserConnector,
} from '../../core/models/api.models';
import {
  FieldDescriptor,
  brandFor,
  capabilitiesByPlatform,
  contentRatingOptions,
  parseFieldDescriptors,
  previewInlineTags,
  validateField,
} from '../../core/models/platforms';
import { ConnectorsService } from '../../core/services/connectors.service';
import { MediaService } from '../../core/services/media.service';
import { PostsService } from '../../core/services/posts.service';
import { ServicesService } from '../../core/services/services.service';
import { TagPresetsService } from '../../core/services/tag-presets.service';
import { TemplatesService } from '../../core/services/templates.service';
import { TextTemplatesService } from '../../core/services/text-templates.service';
import { ToastService } from '../../core/services/toast.service';
import { DescriptorFieldComponent } from '../../shared/components/descriptor-field.component';
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
  /**
   * The image a single-image platform (FurAffinity) will use when several are attached. Exactly one
   * item carries this whenever {@link mediaItems} is non-empty, enforced by {@link setDefaultMedia},
   * the upload/remove handlers, and prefill restoration.
   */
  isDefault: boolean;
}

/**
 * One file's journey from selection through the pre-flight check to the upload itself, shown in
 * the upload tray until it either resolves into a {@link MediaItem} or is dismissed after an error.
 */
interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  /** 0-100. Only meaningful once {@link status} is 'uploading'. */
  progress: number;
  status: 'checking' | 'uploading' | 'error';
  error?: string;
}

/**
 * A single selectable posting target in the compose form. For single-destination platforms this is
 * the connector itself (`selectionId === connectorId`, legacy behaviour); for multi-target platforms
 * (Telegram) it's one of the connector's exposed destinations (`selectionId` is a
 * {@link ConnectorDestinationSummary.id}, distinct from the owning connector's id). The form always
 * submits {@link selectionId} values as `CreatePostRequest.targets`: the backend disambiguates which
 * table each id belongs to.
 */
interface SelectableTarget {
  selectionId: string;
  connectorId: string;
  platform: string;
  displayName: string;
  /** The owning connector's configured "include tags by default" choice (see {@link UserConnector}). */
  defaultIncludeTags: boolean;
  /** The owning connector's configured default content rating (see {@link UserConnector.defaultRating}). */
  defaultRating: ContentRating | null;
}

interface Variable {
  key: string;
  value: string;
}

/**
 * A selected target's per-submission platform choices, ready to render: the fields its platform
 * declares plus the values chosen for this post. FurAffinity's category/species/gender/folders and a
 * Fediverse target's content warning text are current examples: they describe the submission, not
 * the account, so they live here rather than in the connector's settings.
 */
interface TargetOptionsGroup {
  target: SelectableTarget;
  fields: { key: string; descriptor: FieldDescriptor }[];
}

@Component({
  selector: 'app-compose',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    DescriptorFieldComponent,
  ],
  templateUrl: './compose.component.html',
})
export class ComposeComponent {
  private connectors = inject(ConnectorsService);
  private templates = inject(TemplatesService);
  private tagPresets = inject(TagPresetsService);
  private textTemplates = inject(TextTemplatesService);
  private services = inject(ServicesService);
  private posts = inject(PostsService);
  private media = inject(MediaService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly connectorList = signal<UserConnector[]>([]);
  readonly destinationList = signal<ConnectorDestinationSummary[]>([]);
  readonly templateList = signal<Template[]>([]);
  readonly tagPresetList = signal<TagPreset[]>([]);
  /** Available {{tt:name}} tokens: just for the compose hint; resolution happens server-side. */
  readonly textTemplateList = signal<TextTemplate[]>([]);
  readonly catalogue = signal<ServiceDefinition[]>([]);
  brand = brandFor;
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly savingDraft = signal(false);
  /** Set while editing an existing draft (came from the posts list "Edit"), so save/submit target it in place. */
  readonly draftId = signal<string | null>(null);

  // form state
  readonly selectedTargets = signal<Set<string>>(new Set());
  readonly title = signal('');
  readonly description = signal('');
  readonly tags = signal('');
  /** Which tag preset is selected in the "load a tag preset" dropdown; not submitted, just a UI aid. */
  readonly tagPresetId = signal('');
  readonly templateId = signal('');
  readonly variables = signal<Variable[]>([]);
  readonly mediaItems = signal<MediaItem[]>([]);
  /** Files currently being pre-flight-checked or uploaded; removed once each resolves into a MediaItem. */
  readonly uploadTasks = signal<UploadTask[]>([]);
  /** Most recent media-check result per connector id, refreshed on every file selected. */
  readonly mediaLimitsByConnector = signal<Record<string, MediaCheckResultItem>>({});
  /** The gateway's configured upload cap, fetched once at startup; null until loaded (or unconfigured). */
  readonly mediaLimits = signal<MediaLimits | null>(null);
  readonly uploading = computed(() =>
    this.uploadTasks().some((t) => t.status === 'checking' || t.status === 'uploading'),
  );
  readonly scheduleEnabled = signal(false);
  readonly postAt = signal('');
  /** Per-submission platform choices, keyed by connector id then field name. */
  readonly targetOptions = signal<Record<string, Record<string, string>>>({});
  /** Per-target "include tags" choice, keyed by selection id. Absent ⇒ include (the default). */
  readonly targetIncludeTags = signal<Record<string, boolean>>({});
  /**
   * Per-target content rating, keyed by selection id. A key present with a `null` value means the
   * author explicitly cleared the connector's own default for this post; an absent key means
   * "untouched", so the connector's default (if any) still shows in the picker.
   */
  readonly targetRating = signal<Record<string, ContentRating | null>>({});
  readonly ratingOptions = contentRatingOptions;
  /**
   * Per-target post-delivery automation choice (issue #323), keyed by selection id: at most one rule
   * per target in this form. Absent/null means "no automation for this target".
   */
  readonly targetAutomation = signal<Record<string, AutomationRequest | null>>({});
  readonly automationAction = AutomationAction;

  readonly enabledConnectors = computed(() => this.connectorList().filter((c) => c.enabled));
  readonly capsByPlatform = computed(() => capabilitiesByPlatform(this.catalogue()));

  /**
   * The full set of choosable posting targets: single-destination connectors as-is, plus each
   * exposed destination of multi-target connectors (Telegram) in place of the raw connector: a
   * multi-target connector is never itself directly selectable.
   */
  readonly selectableTargets = computed<SelectableTarget[]>(() => {
    const caps = this.capsByPlatform();
    const singles = this.enabledConnectors()
      .filter((c) => !caps[c.platform]?.supportsMultipleTargets)
      .map((c): SelectableTarget => ({
        selectionId: c.id,
        connectorId: c.id,
        platform: c.platform,
        displayName: c.displayName,
        defaultIncludeTags: c.defaultIncludeTags,
        defaultRating: c.defaultRating,
      }));
    const connectorsById = new Map(this.connectorList().map((c) => [c.id, c]));
    const destinations = this.destinationList().map((d): SelectableTarget => ({
      selectionId: d.id,
      connectorId: d.connectorId,
      platform: d.platform,
      displayName: `${d.connectorDisplayName} — ${d.name}`,
      defaultIncludeTags: connectorsById.get(d.connectorId)?.defaultIncludeTags ?? true,
      defaultRating: connectorsById.get(d.connectorId)?.defaultRating ?? null,
    }));
    return [...singles, ...destinations];
  });

  /** Enabled multi-target connectors (Telegram) with nothing exposed yet: nudge to configure them. */
  readonly unconfiguredMultiTargetConnectors = computed(() => {
    const caps = this.capsByPlatform();
    const exposedConnectorIds = new Set(this.destinationList().map((d) => d.connectorId));
    return this.enabledConnectors().filter(
      (c) => caps[c.platform]?.supportsMultipleTargets && !exposedConnectorIds.has(c.id),
    );
  });

  readonly selectedConnectors = computed(() =>
    this.selectableTargets().filter((t) => this.selectedTargets().has(t.selectionId)),
  );

  /**
   * Per-platform descriptors for per-submission choices, parsed once from the catalogue. Keyed by
   * platform because that is what declares them; the values are chosen per connector.
   */
  private readonly postOptionFields = computed<
    Record<string, { key: string; descriptor: FieldDescriptor }[]>
  >(() => {
    const byPlatform: Record<string, { key: string; descriptor: FieldDescriptor }[]> = {};
    for (const def of this.catalogue()) {
      if (!def.postOptionsSchema) continue;
      const descriptors = parseFieldDescriptors(def.postOptionsSchema);
      const fields = Object.entries(descriptors).map(([key, descriptor]) => ({ key, descriptor }));
      if (fields.length) byPlatform[def.platform] = fields;
    }
    return byPlatform;
  });

  /** One section per selected target whose platform takes per-submission choices. */
  readonly targetOptionGroups = computed<TargetOptionsGroup[]>(() => {
    const byPlatform = this.postOptionFields();
    return this.selectedConnectors()
      .filter((t) => byPlatform[t.platform])
      .map((target) => ({ target, fields: byPlatform[target.platform] }));
  });

  /** `selectionId::fieldName` → validation message, mirroring the server's schema enforcement. */
  readonly targetOptionErrors = computed<Record<string, string>>(() => {
    const errors: Record<string, string> = {};
    for (const group of this.targetOptionGroups())
      for (const field of group.fields) {
        const err = validateField(
          field.descriptor,
          this.targetOptions()[group.target.selectionId]?.[field.key],
        );
        if (err) errors[`${group.target.selectionId}::${field.key}`] = err;
      }
    return errors;
  });

  /** The author's current rating choice for a target: their override, else the connector's own default. */
  ratingFor(target: SelectableTarget): ContentRating | null {
    const overrides = this.targetRating();
    return target.selectionId in overrides ? overrides[target.selectionId] : target.defaultRating;
  }

  setRating(selectionId: string, value: ContentRating | null): void {
    this.targetRating.update((all) => ({ ...all, [selectionId]: value }));
  }

  /** One row per selected target whose platform can represent a rating, with the author's current choice. */
  readonly ratingByTarget = computed(() => {
    const caps = this.capsByPlatform();
    return this.selectedConnectors()
      .filter((t) => caps[t.platform]?.supportsRating)
      .map((target) => ({
        target,
        required: caps[target.platform]?.requiresRating ?? false,
        rating: this.ratingFor(target),
      }));
  });

  /** Selected targets whose platform requires a rating but won't be getting one. */
  readonly ratingRequiredIssues = computed(() =>
    this.ratingByTarget()
      .filter((row) => row.required && row.rating == null)
      .map((row) => row.target.displayName),
  );

  readonly furAffinitySelected = computed(() =>
    this.selectedConnectors().some((c) => c.platform === 'FurAffinity'),
  );

  /** The author's current automation choice for a target, or null if they haven't set one. */
  automationFor(target: SelectableTarget): AutomationRequest | null {
    return this.targetAutomation()[target.selectionId] ?? null;
  }

  setAutomationAction(selectionId: string, action: AutomationAction | null): void {
    this.targetAutomation.update((all) => ({
      ...all,
      [selectionId]:
        action == null ? null : { action, delayHours: all[selectionId]?.delayHours ?? 6 },
    }));
  }

  setAutomationDelay(selectionId: string, delayHours: number): void {
    this.targetAutomation.update((all) => {
      const current = all[selectionId];
      return current ? { ...all, [selectionId]: { ...current, delayHours } } : all;
    });
  }

  /** One row per selected target whose platform supports at least one automation action. */
  readonly automationByTarget = computed(() => {
    const caps = this.capsByPlatform();
    return this.selectedConnectors()
      .filter((t) => caps[t.platform]?.supportsRepost || caps[t.platform]?.supportsDelete)
      .map((target) => ({
        target,
        canRepost: caps[target.platform]?.supportsRepost ?? false,
        canDelete: caps[target.platform]?.supportsDelete ?? false,
        rule: this.automationFor(target),
      }));
  });

  /** Selected targets with an automation chosen but no positive delay set. */
  readonly automationDelayIssues = computed(() =>
    this.automationByTarget()
      .filter((row) => row.rule != null && !(row.rule!.delayHours > 0))
      .map((row) => row.target.displayName),
  );

  /** The author's tags, parsed the same way as {@link buildBody} builds the request. */
  readonly parsedTags = computed(() =>
    this.tags()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  );

  /** Whether tags are currently switched on for a target (defaults to its connector's own setting when unset). */
  includeTagsFor(target: SelectableTarget): boolean {
    return this.targetIncludeTags()[target.selectionId] ?? target.defaultIncludeTags;
  }

  setIncludeTags(selectionId: string, value: boolean): void {
    this.targetIncludeTags.update((all) => ({ ...all, [selectionId]: value }));
  }

  /**
   * One row per selected target describing how tags reach it: whether it has a native tags field,
   * whether tags are required, the author's current include/exclude choice (forced on when
   * required), and, for platforms with no native field, a preview of which tags will fit inline.
   */
  readonly tagsByTarget = computed(() => {
    const caps = this.capsByPlatform();
    const tags = this.parsedTags();
    const description = this.description();
    const hasPlaceholder = /\{tags\}/.test(description);
    return this.selectedConnectors().map((target) => {
      const c = caps[target.platform];
      const supportsTags = c?.supportsTags ?? true;
      const requiresTags = c?.requiresTags ?? false;
      const includeTags = requiresTags || this.includeTagsFor(target);
      let preview: { included: string[]; omitted: number } | null = null;
      if (!supportsTags && includeTags && tags.length > 0) {
        const baseLength = hasPlaceholder
          ? description.length - '{tags}'.length
          : description.length + 2; // "\n\n" separator when appended rather than interpolated
        preview = previewInlineTags(tags, Math.max(0, baseLength), c?.maxContentLength ?? null);
      }
      return { target, supportsTags, requiresTags, includeTags, preview };
    });
  });

  /** Selected targets whose platform requires at least one tag but won't be getting any. */
  readonly tagsRequiredIssues = computed(() => {
    const hasTags = this.parsedTags().length > 0;
    return this.tagsByTarget()
      .filter((row) => row.requiresTags && !hasTags)
      .map((row) => row.target.displayName);
  });

  /** Selected targets whose platform requires at least one media attachment but won't be getting one. */
  readonly mediaRequiredIssues = computed(() => {
    const caps = this.capsByPlatform();
    const hasMedia = this.mediaItems().length > 0;
    if (hasMedia) return [];
    return this.selectedConnectors()
      .filter((t) => caps[t.platform]?.requiresMedia)
      .map((t) => t.displayName);
  });

  /** Requirements FurAffinity enforces at delivery time, surfaced before the post is queued. */
  readonly furAffinityIssues = computed(() => {
    if (!this.furAffinitySelected()) return [];
    const issues: string[] = [];
    if (!this.title().trim()) issues.push('Add a title.');
    else if (this.title().trim().length > 60)
      issues.push('Keep the title to 60 characters or fewer.');
    // The generic "requires a rating" check (ratingRequiredIssues) covers this for every selected
    // FurAffinity target, so it isn't duplicated here.

    const media = this.mediaItems();
    if (media.length === 0) {
      issues.push('Attach an image.');
    } else {
      // FurAffinity's gallery form takes exactly one file. When several are attached (for platforms
      // that support multiple images), it uses the author's chosen default image and drops the rest.
      const item = media.find((m) => m.isDefault) ?? media[0];
      const contentType = (item.mimeType || item.ref.contentType).toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(contentType)) {
        issues.push('Use a JPEG, PNG, or GIF image for the default image.');
      }
      if (
        contentType === 'image/gif' &&
        item.fileSize != null &&
        item.fileSize > 10 * 1024 * 1024
      ) {
        issues.push('Keep the default animated GIF at or below 10 MiB.');
      }
    }

    const validTags = this.tags()
      .split(',')
      .map((tag) => tag.trim().replace(/\s+/g, '_'))
      .filter((tag) => tag.length >= 3);
    if (validTags.length < 3) issues.push('Add at least three tags of three or more characters.');
    return issues;
  });

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
    const selectedConnectorIds = new Set(this.selectedConnectors().map((t) => t.connectorId));
    const resizingIds = new Set<string>();
    for (const item of items) {
      for (const check of item.resizeChecks ?? []) {
        if (selectedConnectorIds.has(check.connectorId) && check.willResize) {
          resizingIds.add(check.connectorId);
        }
      }
    }
    return this.selectedConnectors().filter((t) => resizingIds.has(t.connectorId));
  });

  /**
   * Selected targets whose attachment cap is smaller than the number of images currently attached —
   * the platform is sent only the first {@link MediaCheckResultItem.maxMediaAttachments} of them and
   * silently drops the rest, so this is surfaced before submit rather than after.
   */
  readonly mediaAttachmentLimitTargets = computed(() => {
    const count = this.mediaItems().length;
    if (count === 0) return [];
    const limits = this.mediaLimitsByConnector();
    return this.selectedConnectors().filter((t) => {
      const max = limits[t.connectorId]?.maxMediaAttachments;
      return max != null && count > max;
    });
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
    () =>
      this.selectedTargets().size > 0 &&
      this.ratingRequiredIssues().length === 0 &&
      this.furAffinityIssues().length === 0 &&
      this.tagsRequiredIssues().length === 0 &&
      this.mediaRequiredIssues().length === 0 &&
      this.automationDelayIssues().length === 0 &&
      Object.keys(this.targetOptionErrors()).length === 0 &&
      !this.submitting() &&
      !this.uploading() &&
      !this.savingDraft(),
  );

  /** Drafts are deliberately unvalidated: that's the point of saving one before it's ready. */
  readonly canSaveDraft = computed(
    () => !this.submitting() && !this.uploading() && !this.savingDraft(),
  );

  constructor() {
    // "Post again" (history) and "Edit" (drafts) hand us the original content via router state;
    // only "Edit" also sets draftId, so saving/publishing target the same post instead of creating one.
    const state = (this.router.getCurrentNavigation()?.extras.state ??
      (typeof history !== 'undefined' ? history.state : null)) as {
      prefill?: PostContent;
      draftId?: string;
    } | null;
    const prefill = state?.prefill;
    if (state?.draftId) this.draftId.set(state.draftId);

    forkJoin({
      connectors: this.connectors.list(),
      destinations: this.connectors.listAllDestinations(),
      templates: this.templates.list(),
      tagPresets: this.tagPresets.list(),
      textTemplates: this.textTemplates.list(),
      catalogue: this.services.list(),
    }).subscribe({
      next: ({ connectors, destinations, templates, tagPresets, textTemplates, catalogue }) => {
        this.connectorList.set(connectors);
        this.destinationList.set(destinations);
        this.templateList.set(templates);
        this.tagPresetList.set(tagPresets);
        this.textTemplateList.set(textTemplates);
        this.catalogue.set(catalogue);
        this.loading.set(false);
        if (prefill) this.applyPrefill(prefill);
      },
      error: () => {
        this.toast.error('Could not load compose data');
        this.loading.set(false);
      },
    });

    // Fetched separately (not in the forkJoin above): best-effort, and shouldn't block the rest of
    // the form loading if it fails — an unset limit just means no client-side cap is enforced.
    this.media.getLimits().subscribe({
      next: (limits) => this.mediaLimits.set(limits),
      error: () => {
        /* no client-side upload cap if this fails to load */
      },
    });
  }

  /** Loads a saved tag preset's tags into the tags field, replacing whatever is there. */
  applyTagPreset(id: string): void {
    this.tagPresetId.set(id);
    if (!id) return;
    const preset = this.tagPresetList().find((p) => p.id === id);
    if (preset) this.tags.set(preset.tags.join(', '));
  }

  /**
   * Appends a `{{tt:name}}` reference to the description: resolution (per-connector override, else
   * the template's default, else blank) happens server-side at delivery, not here.
   */
  insertTextTemplate(name: string): void {
    const current = this.description();
    const separator = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
    this.description.set(`${current}${separator}{{tt:${name}}}`);
  }

  /**
   * Re-seeds the form from a past post. Only re-ticks targets that still exist and are enabled.
   * Editing a draft ({@link draftId} set) also restores its schedule. Unlike "post again", it
   * hasn't been sent yet, so a future schedule is still meaningful.
   */
  private applyPrefill(content: PostContent): void {
    const available = new Set(this.selectableTargets().map((t) => t.selectionId));
    this.selectedTargets.set(new Set(content.connectorIds.filter((id) => available.has(id))));
    this.title.set(content.title ?? '');
    this.description.set(content.description ?? '');
    this.tags.set(content.tags.join(', '));
    this.templateId.set(content.templateId ?? '');
    this.variables.set(Object.entries(content.variables).map(([key, value]) => ({ key, value })));
    // Keep the platform choices only for targets that are still ticked; a connector/destination that
    // has since been removed or disabled would otherwise leave orphaned options on the request.
    this.targetOptions.set(
      Object.fromEntries(
        Object.entries(content.targetOptions ?? {}).filter(([id]) => available.has(id)),
      ),
    );
    this.targetIncludeTags.set(
      Object.fromEntries(
        Object.entries(content.targetIncludeTags ?? {}).filter(([id]) => available.has(id)),
      ),
    );
    // Every entry here is a resolved rating the post was actually created with, so it's re-seeded as
    // an explicit choice (not left "untouched", which would let the connector's current default
    // silently override what this post was really sent with).
    this.targetRating.set(
      Object.fromEntries(
        Object.entries(content.targetRating ?? {}).filter(([id]) => available.has(id)),
      ),
    );
    // The compose form offers one automation rule per target; a post created some other way (or in
    // an earlier release) with several is re-seeded with just its first rule.
    this.targetAutomation.set(
      Object.fromEntries(
        Object.entries(content.targetAutomations ?? {})
          .filter(([id, rules]) => available.has(id) && rules.length > 0)
          .map(([id, rules]) => [id, rules[0]]),
      ),
    );
    this.mediaItems.set(
      content.media.map((ref) => ({
        ref,
        name: ref.key.split('/').pop() ?? ref.key,
        alt: ref.alt ?? '',
        mimeType: ref.contentType,
        isDefault: ref.isDefault ?? false,
      })),
    );
    this.ensureDefaultMedia();
    if (this.draftId() && content.postAt) {
      this.scheduleEnabled.set(true);
      // <input type="datetime-local"> wants local time with no zone/seconds.
      const local = new Date(content.postAt);
      local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
      this.postAt.set(local.toISOString().slice(0, 16));
    }
    // Otherwise ("post again") deliberately not carrying the old schedule time across: it's
    // almost certainly in the past.
  }

  /** Comma-joined display names, for capability warnings. */
  names(targets: { displayName: string }[]): string {
    return targets.map((t) => t.displayName).join(', ');
  }

  isSelected(id: string): boolean {
    return this.selectedTargets().has(id);
  }

  // ----- per-submission platform options -------------------------------------
  targetOption(connectorId: string, key: string): string {
    return this.targetOptions()[connectorId]?.[key] ?? '';
  }

  targetOptionError(connectorId: string, key: string): string | undefined {
    return this.targetOptionErrors()[`${connectorId}::${key}`];
  }

  patchTargetOption(connectorId: string, key: string, value: string): void {
    this.targetOptions.update((all) => ({
      ...all,
      [connectorId]: { ...all[connectorId], [key]: value },
    }));
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
    input.value = '';
    for (const file of files) this.queueUpload(file);
  }

  /** Starts one file on its way: tray entry first, then pre-flight check, then the upload itself. */
  private queueUpload(file: File): void {
    const task: UploadTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'checking',
    };
    this.uploadTasks.update((tasks) => [...tasks, task]);
    this.startUpload(task);
  }

  /**
   * The gateway's own hard cap (see {@link MediaLimits}): checked purely locally, against a value
   * already fetched at form load, so an oversized file is rejected instantly — no request at all —
   * instead of only failing partway through (or after) the upload itself.
   */
  private startUpload(task: UploadTask): void {
    const cap = this.mediaLimits()?.maxUploadSizeBytes;
    if (cap != null && task.file.size > cap) {
      this.patchUploadTask(task.id, {
        status: 'error',
        error: `File exceeds the ${this.humanFileSize(cap)} upload limit`,
      });
      return;
    }
    this.runPreflightThenUpload(task);
  }

  /**
   * Checks the file against every enabled connector's size caps before uploading it. This needs
   * only the file's size and MIME type, not its bytes, so it's a small, fast request that surfaces
   * resize warnings well ahead of the (potentially slow) upload — instead of after it, as before.
   */
  private runPreflightThenUpload(task: UploadTask): void {
    const connectorIds = this.enabledConnectors().map((c) => c.id);
    const checked$ = connectorIds.length
      ? this.connectors.checkMedia({
          connectorIds,
          fileSize: task.file.size,
          mimeType: task.file.type,
        })
      : of<MediaCheckResultItem[]>([]);

    checked$.subscribe({
      next: (checks) => {
        this.mediaLimitsByConnector.update((all) => {
          const next = { ...all };
          for (const c of checks) next[c.connectorId] = c;
          return next;
        });
        this.beginTransfer(task, checks);
      },
      // Best-effort: a failed pre-flight check shouldn't block the upload itself.
      error: () => this.beginTransfer(task, []),
    });
  }

  private beginTransfer(task: UploadTask, resizeChecks: MediaCheckResultItem[]): void {
    this.patchUploadTask(task.id, { status: 'uploading' });
    this.media.upload(task.file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.patchUploadTask(task.id, {
            progress: Math.round((100 * event.loaded) / event.total),
          });
        } else if (event.type === HttpEventType.Response && event.body) {
          this.completeUpload(task, event.body, resizeChecks);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.patchUploadTask(task.id, { status: 'error', error: this.uploadErrorMessage(err) });
      },
    });
  }

  private completeUpload(
    task: UploadTask,
    ref: MediaRef,
    resizeChecks: MediaCheckResultItem[],
  ): void {
    const item: MediaItem = {
      ref,
      name: task.name,
      alt: '',
      fileSize: task.size,
      mimeType: task.file.type,
      resizeChecks,
      // The very first image attached becomes the default; later ones don't disturb an existing
      // choice. ensureDefaultMedia() below covers the empty-list race between concurrent uploads.
      isDefault: this.mediaItems().length === 0,
    };
    this.mediaItems.update((m) => [...m, item]);
    this.ensureDefaultMedia();
    this.uploadTasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
  }

  private patchUploadTask(id: string, patch: Partial<UploadTask>): void {
    this.uploadTasks.update((tasks) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  private uploadErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 413) return 'File is too large to upload';
    if (err.status === 0) return 'Network error — check your connection';
    return (err.error as { error?: string } | null)?.error || 'Upload failed';
  }

  /** Drops a failed upload from the tray without retrying it. */
  dismissUploadTask(id: string): void {
    this.uploadTasks.update((tasks) => tasks.filter((t) => t.id !== id));
  }

  /** Re-attempts a failed upload from scratch, using the same file. */
  retryUpload(id: string): void {
    const task = this.uploadTasks().find((t) => t.id === id);
    if (!task) return;
    this.patchUploadTask(id, { status: 'checking', progress: 0, error: undefined });
    this.startUpload(task);
  }

  /** e.g. 4.2 MB — for the upload tray, where a raw byte count isn't very readable. */
  humanFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value.toFixed(1)} ${units[unit]}`;
  }

  /** The attachment cap reported for a target's connector, if known (see {@link mediaLimitsByConnector}). */
  maxAttachmentsFor(target: SelectableTarget): number | null {
    return this.mediaLimitsByConnector()[target.connectorId]?.maxMediaAttachments ?? null;
  }

  /** Returns the names of selected connectors that will resize the given media item. */
  resizeLabelsFor(item: MediaItem): string {
    if (!item.resizeChecks?.length) return '';
    const selectedConnectorIds = new Set(this.selectedConnectors().map((t) => t.connectorId));
    return item.resizeChecks
      .filter((c) => c.willResize && selectedConnectorIds.has(c.connectorId))
      .map((c) => c.displayName)
      .join(', ');
  }

  patchAlt(i: number, value: string): void {
    this.mediaItems.update((m) => m.map((x, idx) => (idx === i ? { ...x, alt: value } : x)));
  }

  /**
   * Marks one attached image as the "default": the one single-image platforms (FurAffinity) use
   * when several are attached, instead of rejecting the post.
   */
  setDefaultMedia(i: number): void {
    this.mediaItems.update((m) => m.map((x, idx) => ({ ...x, isDefault: idx === i })));
  }

  removeMedia(i: number): void {
    this.mediaItems.update((m) => m.filter((_, idx) => idx !== i));
    this.ensureDefaultMedia();
  }

  /** Guarantees exactly one item is flagged default whenever media is attached. */
  private ensureDefaultMedia(): void {
    this.mediaItems.update((m) =>
      m.length > 0 && !m.some((x) => x.isDefault)
        ? m.map((x, idx) => (idx === 0 ? { ...x, isDefault: true } : x))
        : m,
    );
  }

  // ----- submit -------------------------------------------------------------
  /** Assembles the request body from current form state. Shared by submit and saveDraft. */
  private buildBody(): CreatePostRequest {
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
      isDefault: m.isDefault,
    }));

    let postAt: string | null = null;
    if (this.scheduleEnabled() && this.postAt()) {
      postAt = new Date(this.postAt()).toISOString();
    }

    // Only send choices for targets actually being posted to, and drop blanks: an unset field means
    // "use the platform's default", which the server represents by the key being absent.
    const targetOptions: Record<string, Record<string, string>> = {};
    for (const group of this.targetOptionGroups()) {
      const chosen = Object.fromEntries(
        group.fields
          .map((f) => [f.key, this.targetOption(group.target.selectionId, f.key).trim()] as const)
          .filter(([, value]) => value.length > 0),
      );
      if (Object.keys(chosen).length) targetOptions[group.target.selectionId] = chosen;
    }

    // Only send a per-target choice that differs from the connector's own default — an absent
    // entry already falls back to that default server-side, and RequiresTags platforms ignore
    // this regardless.
    const targetIncludeTags: Record<string, boolean> = {};
    for (const target of this.selectedConnectors()) {
      const chosen = this.includeTagsFor(target);
      if (chosen !== target.defaultIncludeTags) targetIncludeTags[target.selectionId] = chosen;
    }

    // Unlike targetIncludeTags, the server applies no fallback of its own for rating (it's a
    // per-target value now, not one shared field): send whatever's actually showing for each rated
    // target, default-resolved or overridden, and omit only where nothing is chosen at all.
    const targetRating: Record<string, ContentRating> = {};
    for (const row of this.ratingByTarget()) {
      if (row.rating != null) targetRating[row.target.selectionId] = row.rating;
    }

    const targetAutomations: Record<string, AutomationRequest[]> = {};
    for (const row of this.automationByTarget()) {
      if (row.rule != null) targetAutomations[row.target.selectionId] = [row.rule];
    }

    return {
      targets: [...this.selectedTargets()],
      title: this.title().trim() || null,
      description: this.description().trim() || null,
      htmlDescription: null,
      tags: tags.length ? tags : null,
      media: media.length ? media : null,
      templateId: this.templateId() || null,
      variables,
      postAt,
      targetOptions: Object.keys(targetOptions).length ? targetOptions : null,
      targetIncludeTags: Object.keys(targetIncludeTags).length ? targetIncludeTags : null,
      targetRating: Object.keys(targetRating).length ? targetRating : null,
      targetAutomations: Object.keys(targetAutomations).length ? targetAutomations : null,
    };
  }

  submit(): void {
    const targets = [...this.selectedTargets()];
    if (targets.length === 0) {
      this.toast.warning('Pick at least one target');
      return;
    }
    if (this.furAffinityIssues().length) {
      this.toast.warning('Complete the FurAffinity requirements');
      return;
    }
    if (this.tagsRequiredIssues().length) {
      this.toast.warning('Add tags', `Required by ${this.tagsRequiredIssues().join(', ')}`);
      return;
    }
    if (this.mediaRequiredIssues().length) {
      this.toast.warning('Attach media', `Required by ${this.mediaRequiredIssues().join(', ')}`);
      return;
    }
    if (this.ratingRequiredIssues().length) {
      this.toast.warning(
        'Choose a content rating',
        `Required by ${this.ratingRequiredIssues().join(', ')}`,
      );
      return;
    }
    if (Object.keys(this.targetOptionErrors()).length) {
      this.toast.warning('Fix the platform options');
      return;
    }
    if (this.automationDelayIssues().length) {
      this.toast.warning(
        'Set an automation delay',
        `Needs a delay greater than 0 hours: ${this.automationDelayIssues().join(', ')}`,
      );
      return;
    }

    const body = this.buildBody();
    const draftId = this.draftId();

    this.submitting.set(true);
    if (draftId) {
      // Editing an existing draft: persist the edits, then publish it. It stops being a draft.
      this.posts.updateDraft(draftId, body).subscribe({
        next: () =>
          this.posts.publish(draftId).subscribe({
            next: () => {
              this.toast.success(body.postAt ? 'Post scheduled' : 'Post queued');
              this.router.navigate(['/posts', draftId]);
            },
            error: (err) => {
              this.toast.error('Could not publish draft', err?.error?.error);
              this.submitting.set(false);
            },
          }),
        error: (err) => {
          this.toast.error('Could not save draft', err?.error?.error);
          this.submitting.set(false);
        },
      });
      return;
    }

    this.posts.create(body).subscribe({
      next: (res) => {
        this.toast.success(body.postAt ? 'Post scheduled' : 'Post queued');
        this.router.navigate(['/posts', res.postId]);
      },
      error: (err) => {
        this.toast.error('Could not create post', err?.error?.error);
        this.submitting.set(false);
      },
    });
  }

  /**
   * Saves the current form state as a draft: deliberately skips the submit-time validation
   * (rating/FurAffinity/target-option checks), since the whole point is to save something
   * incomplete for later. Creates a new draft the first time, then updates that same post on
   * every subsequent save.
   */
  saveDraft(): void {
    const body: CreatePostRequest = { ...this.buildBody(), isDraft: true };
    const draftId = this.draftId();

    this.savingDraft.set(true);
    const done = () => {
      this.toast.success('Draft saved');
      this.savingDraft.set(false);
    };
    const fail = (err: unknown) => {
      this.toast.error(
        'Could not save draft',
        (err as { error?: { error?: string } })?.error?.error,
      );
      this.savingDraft.set(false);
    };

    if (draftId) {
      this.posts.updateDraft(draftId, body).subscribe({ next: done, error: fail });
    } else {
      this.posts.create(body).subscribe({
        next: (res) => {
          this.draftId.set(res.postId);
          done();
        },
        error: fail,
      });
    }
  }
}

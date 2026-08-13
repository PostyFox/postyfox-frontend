/**
 * TypeScript mirrors of the PostyFox core-api / post-api DTOs.
 *
 * The APIs serialize with `JsonSerializerDefaults.Web` (camelCase property names,
 * enums as **numbers**), so enum members below carry their integer values.
 */

// ---------------------------------------------------------------------------
// Enums (numeric — must match PostyFox.Domain.Enums)
// ---------------------------------------------------------------------------

/** Status of a single per-platform delivery target. */
export enum TargetStatus {
  Queued = 0,
  Generating = 1,
  Ready = 2,
  Delivering = 3,
  Delivered = 4,
  Failed = 5,
  Cancelled = 6,
}

/** Aggregated status of a root post across all its targets. */
export enum PostRootStatus {
  Queued = 0,
  Generating = 1,
  Delivering = 2,
  Delivered = 3,
  PartiallyFailed = 4,
  Failed = 5,
  Cancelled = 6,
  /** Saved but not yet submitted; has no targets/queue activity until published. */
  Draft = 7,
}

/** Author-selected audience/content classification for platforms that require it. */
export enum ContentRating {
  General = 0,
  Mature = 1,
  Adult = 2,
  Extreme = 3,
}

// ---------------------------------------------------------------------------
// Profile / API keys
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  prefix: string;
  name: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Returned once at creation; the plaintext `apiKey` is never retrievable again. */
export interface ApiKeyCreated {
  id: string;
  apiKey: string;
  prefix: string;
}

export interface CreateKeyRequest {
  name?: string | null;
}

export interface AdminAccess {
  isAdmin: boolean;
}

export interface OperationalSecret {
  key: string;
  component: string;
  displayName: string;
  description: string;
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Services catalogue + connectors
// ---------------------------------------------------------------------------

/** Capabilities a platform supports (surfaced by the connector's Describe() in core). */
export interface Capabilities {
  supportsTitle: boolean;
  supportsMedia: boolean;
  supportsThreads: boolean;
  /** Max characters the platform accepts, or null for effectively unlimited. */
  maxContentLength: number | null;
  /** True when the platform offers an interactive OAuth "connect" flow instead of pasted secrets. */
  supportsOAuth: boolean;
  /** True when authentication is supplied by a PostyFox Connect browser client. */
  supportsCookiePairing: boolean;
  /** True when the platform can represent an authored content rating. */
  supportsRating: boolean;
  /** True when each delivery must include an explicit content rating. */
  requiresRating: boolean;
  /**
   * True when a single login can post to several distinct chats/channels (e.g. Telegram). The
   * connector itself is not a selectable target for these platforms — the compose form offers each
   * exposed {@link ConnectorDestinationSummary} instead. See connectors.component for how the user
   * picks which of the platform's live targets to expose.
   */
  supportsMultipleTargets: boolean;
}

export interface ServiceDefinition extends Capabilities {
  id: string;
  name: string;
  enabled: boolean;
  /** Flat JSON object of non-secret config fields, e.g. `{"Webhook":""}`. */
  configSchema: string;
  /** Flat JSON object of secret config fields, or null. */
  secureConfigSchema: string | null;
  /**
   * Field descriptors for choices the platform takes *per submission* rather than per account —
   * FurAffinity's category, species, gender and gallery folders. Same format as
   * {@link configSchema}; null when the platform has none. Rendered by the compose form once per
   * selected target and submitted as {@link CreatePostRequest.targetOptions}.
   */
  postOptionsSchema: string | null;
  platform: string;
}

export interface UserConnector {
  id: string;
  serviceDefinitionId: string;
  platform: string;
  displayName: string;
  /** JSON string of the stored non-secret config. */
  configJson: string;
  enabled: boolean;
}

export interface UserConnectorUpsertRequest {
  id?: string | null;
  serviceDefinitionId: string;
  displayName: string;
  configJson: string;
  /** Written to the secret store; omit to leave unchanged. */
  secureConfigJson?: string | null;
  enabled: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  detail?: string | null;
}

export interface ConnectorCookiePairingStart {
  pairingToken: string;
  expiresAt: string;
}

export interface ConnectorTarget {
  id: string;
  name: string;
}

/**
 * One destination (chat/channel) a user has exposed for posting under a connector — see
 * `GET/PUT /api/connectors/{id}/destinations`. Only meaningful for connectors whose
 * {@link ServiceDefinition.supportsMultipleTargets} is true.
 */
export interface ConnectorDestination {
  id: string;
  connectorId: string;
  externalId: string;
  name: string;
}

/**
 * A {@link ConnectorDestination} flattened with its owning connector's identity, as returned by
 * `GET /api/connectors/destinations` — everything the compose form needs to build its full set of
 * selectable delivery targets.
 */
export interface ConnectorDestinationSummary {
  id: string;
  connectorId: string;
  platform: string;
  connectorDisplayName: string;
  externalId: string;
  name: string;
}

export interface ConnectorDestinationInput {
  externalId: string;
  name: string;
}

export interface SetConnectorDestinationsRequest {
  destinations: ConnectorDestinationInput[];
}

export interface TelegramLoginStep {
  /** e.g. 'code', 'password', 'complete'. */
  status: string;
  /** The kind of value the server is asking for next. */
  input?: string | null;
  /** Human-readable prompt for the requested value. */
  label?: string | null;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface Template {
  id: string;
  title: string;
  markdownBody: string;
}

export interface TemplateUpsertRequest {
  id?: string | null;
  title: string;
  markdownBody: string;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaRef {
  container: string;
  key: string;
  contentType: string;
  alt?: string | null;
}

/** Live per-connector limits reported by `GET /api/connectors/{id}/limits`. */
export interface ConnectorLimits {
  maxContentLength: number | null;
  maxMediaAttachments: number | null;
  supportedMimeTypes: string[] | null;
  /** Max image file size in bytes; null = no reported cap. */
  imageSizeLimit: number | null;
  /** Max video file size in bytes; null = no reported cap. */
  videoSizeLimit: number | null;
}

/** Request body for `POST /api/connectors/media-check`. */
export interface MediaCheckRequest {
  connectorIds: string[];
  fileSize: number;
  mimeType: string;
}

/**
 * Per-connector result from `POST /api/connectors/media-check`.
 * `willResize` is true when the file exceeds the connector's size cap and will be
 * automatically resized/transcoded before delivery.
 */
export interface MediaCheckResultItem {
  connectorId: string;
  platform: string;
  displayName: string;
  willResize: boolean;
  imageSizeLimit: number | null;
  videoSizeLimit: number | null;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface CreatePostRequest {
  /**
   * Either a {@link UserConnector.id} (single-destination platforms) or a
   * {@link ConnectorDestinationSummary.id} (multi-target platforms like Telegram — one entry per
   * chat/channel the user picked).
   */
  targets: string[];
  title?: string | null;
  description?: string | null;
  htmlDescription?: string | null;
  tags?: string[] | null;
  media?: MediaRef[] | null;
  templateId?: string | null;
  variables?: Record<string, string> | null;
  postAt?: string | null;
  rating?: ContentRating | null;
  /**
   * Per-submission platform choices, keyed by target connector id (see
   * {@link ServiceDefinition.postOptionsSchema}). Validated server-side; anything the platform does
   * not declare is dropped.
   */
  targetOptions?: Record<string, Record<string, string>> | null;
  /**
   * Save this as a draft instead of submitting it: no targets are resolved/validated and nothing is
   * enqueued for delivery. `targets`/`targetOptions` are still stored as-authored so the draft can be
   * edited and eventually published (`POST /{id}/publish`).
   */
  isDraft?: boolean;
}

export interface CreatePostResponse {
  postId: string;
  rootStatus: PostRootStatus;
}

export interface PostTargetStatus {
  targetId: string;
  platform: string;
  status: TargetStatus;
  externalId: string | null;
  externalUrl: string | null;
  error: string | null;
  attempts: number;
}

export interface PostStatus {
  postId: string;
  rootStatus: PostRootStatus;
  targets: PostTargetStatus[];
}

/** Authored content of a post (`GET /api/posts/{id}/content`), used to re-seed the compose form. */
export interface PostContent {
  title: string | null;
  description: string | null;
  htmlDescription: string | null;
  tags: string[];
  media: MediaRef[];
  templateId: string | null;
  variables: Record<string, string>;
  /**
   * Connector or destination ids the post targeted (used to re-tick the target checkboxes) — see
   * {@link CreatePostRequest.targets}.
   */
  connectorIds: string[];
  postAt: string | null;
  rating: ContentRating | null;
  /** The per-submission platform choices it was created with, keyed by connector id. */
  targetOptions: Record<string, Record<string, string>>;
}

/** Lightweight row from `GET /api/posts` (list / activity view — no per-target detail). */
export interface PostSummary {
  postId: string;
  rootStatus: PostRootStatus;
  title: string;
  platforms: string[];
  targetCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  postAt: string | null;
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export interface TriggerRegistrationRequest {
  sourceType: string;
  externalAccount: string;
  templateId?: string | null;
  targetConnectorId: string;
  notifyFrequencyHrs: number;
}

export interface Trigger {
  id: string;
  sourceType: string;
  externalAccount: string;
  templateId: string | null;
  targetConnectorId: string | null;
  notifyFrequencyHrs: number;
  lastFiredAt: string | null;
}

// ---------------------------------------------------------------------------
// Auth (oauth2-proxy /userinfo)
// ---------------------------------------------------------------------------

export interface UserInfo {
  user?: string;
  email?: string;
  preferredUsername?: string;
  /** Raw claims passthrough. */
  [key: string]: unknown;
}

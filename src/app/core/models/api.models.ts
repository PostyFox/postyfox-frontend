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
}

/** Aggregated status of a root post across all its targets. */
export enum PostRootStatus {
  Queued = 0,
  Generating = 1,
  Delivering = 2,
  Delivered = 3,
  PartiallyFailed = 4,
  Failed = 5,
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
}

export interface ServiceDefinition extends Capabilities {
  id: string;
  name: string;
  enabled: boolean;
  /** Flat JSON object of non-secret config fields, e.g. `{"Webhook":""}`. */
  configSchema: string;
  /** Flat JSON object of secret config fields, or null. */
  secureConfigSchema: string | null;
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

export interface ConnectorTarget {
  id: string;
  name: string;
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

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface CreatePostRequest {
  targets: string[];
  title?: string | null;
  description?: string | null;
  htmlDescription?: string | null;
  tags?: string[] | null;
  media?: MediaRef[] | null;
  templateId?: string | null;
  variables?: Record<string, string> | null;
  postAt?: string | null;
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

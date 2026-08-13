import { Capabilities, ServiceDefinition, UserConnector } from './api.models';

/**
 * Presentation-only branding for known platforms — iconography and human copy.
 * This is deliberately NOT capability data: capabilities (title/media/threads/char-limit) come
 * from the API (`/api/services`, sourced from each connector's Describe()), and per-field metadata
 * (label/help/placeholder/type/link) + validation now travel in the service definition's
 * config/secure schema as field *descriptors* (see {@link parseFieldDescriptors}). This registry
 * only keeps what's coupled to the frontend's icon set: iconography, colour and platform blurb.
 *
 * Keyed by the platform string the API returns. Unknown platforms fall back to sane defaults, so
 * new connectors added server-side still render (just without bespoke branding).
 */

/**
 * One choice for a field that declares {@link FieldDescriptor.options}. `group` is the `<optgroup>`
 * heading it belongs under; consecutive options sharing a group are rendered together (see
 * {@link groupedOptions}). Ungrouped options stand alone.
 */
export interface FieldOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * A single connector config/secret field, as declared by the backend service definition. Carries
 * both presentation (label/help/placeholder/type/link/options) and validation (required/pattern/
 * message/min-maxLength/options) metadata. The server enforces the validation keys authoritatively;
 * the client applies them for fast inline feedback via {@link validateField}.
 */
export interface FieldDescriptor {
  label: string;
  help?: string;
  /** For an `options` field, labels the blank “not set” choice. */
  placeholder?: string;
  type?: 'text' | 'password' | 'url' | 'tel';
  link?: { href: string; text: string };
  required?: boolean;
  /** Regex source the value must match (applied only when a value is present). */
  pattern?: string;
  /** Error shown when `pattern` (or `options`) fails — falls back to a generic message. */
  message?: string;
  minLength?: number;
  maxLength?: number;
  /**
   * A fixed set of choices. Present ⇒ render a `<select>` rather than a text box, and reject values
   * outside the list. Platforms whose fields are opaque numeric IDs (FurAffinity's category, theme,
   * species, gender) declare these so users pick a name instead of looking up a number.
   */
  options?: FieldOption[];
}

/** An `<optgroup>` worth of options; `label` is null for options that belong to no group. */
export interface FieldOptionGroup {
  label: string | null;
  options: FieldOption[];
}

/**
 * Collapse a descriptor's flat option list into `<optgroup>` runs, preserving the server's order.
 * Consecutive options sharing a `group` become one run; consecutive ungrouped ones become a run with
 * a null label, which the template renders as bare `<option>`s. A field with no options yields `[]`.
 */
export function groupedOptions(descriptor: FieldDescriptor | undefined): FieldOptionGroup[] {
  const groups: FieldOptionGroup[] = [];
  for (const option of descriptor?.options ?? []) {
    const label = option.group ?? null;
    const last = groups[groups.length - 1];
    if (last?.label === label) last.options.push(option);
    else groups.push({ label, options: [option] });
  }
  return groups;
}

export interface PlatformBrand {
  label: string;
  /** bootstrap-icon class. */
  icon: string;
  /** Brand colour (hex). */
  color: string;
  blurb?: string;
  /** Extra setup guidance shown in the connector editor. */
  setup?: string;
  docs?: { href: string; text: string };
}

const BRANDS: Record<string, PlatformBrand> = {
  DiscordWH: {
    label: 'Discord',
    icon: 'bi-discord',
    color: '#5865F2',
    blurb: 'Post to a Discord channel via an incoming webhook.',
    docs: {
      href: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
      text: 'How to create a webhook',
    },
  },
  Telegram: {
    label: 'Telegram',
    icon: 'bi-telegram',
    color: '#26A5E4',
    blurb: 'Post to Telegram chats or channels as your user account.',
    setup:
      'Save the connector first, then use “Log in” on its card to complete the code / 2FA flow.',
  },
  BlueSky: {
    label: 'Bluesky',
    icon: 'bi-bluesky',
    color: '#0085FF',
    blurb: 'Post to Bluesky via the AT Protocol.',
  },
  Tumblr: {
    label: 'Tumblr',
    icon: 'bi-postcard-fill',
    color: '#36465D',
    blurb: 'Post to a Tumblr blog.',
    setup: 'Provide OAuth tokens obtained from authorising the Tumblr application.',
  },
  FurAffinity: {
    label: 'FurAffinity',
    icon: 'bi-palette-fill',
    color: '#2e3b4f',
    blurb: 'Publish gallery submissions to your FurAffinity account.',
    setup:
      'Sign in through PostyFox Connect so your FurAffinity password and session cookies never pass through this page.',
    docs: {
      href: 'https://www.furaffinity.net/login/',
      text: 'Sign in to FurAffinity',
    },
  },
};

const FALLBACK: PlatformBrand = { label: '', icon: 'bi-plug', color: '#8c57ff' };

export function brandFor(platform: string | null | undefined): PlatformBrand {
  if (platform && BRANDS[platform]) return BRANDS[platform];
  return { ...FALLBACK, label: platform || 'Connector' };
}

/**
 * Parse a service-definition config/secure schema into field descriptors keyed by field name.
 *
 * A schema is a JSON object keyed by field name whose value is either a legacy placeholder string
 * (`""` — no metadata, so just `{ label: key }`) or a descriptor object. Order is preserved.
 * Keys starting with `$` are schema metadata (e.g. `$comment`), not fields, and are skipped.
 * Returns `{}` for a null/blank/malformed schema.
 */
export function parseFieldDescriptors(
  schema: string | null | undefined,
): Record<string, FieldDescriptor> {
  if (!schema) return {};
  let obj: unknown;
  try {
    obj = JSON.parse(schema);
  } catch {
    return {};
  }
  if (!obj || typeof obj !== 'object') return {};
  const result: Record<string, FieldDescriptor> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.startsWith('$')) continue;
    result[key] =
      value && typeof value === 'object'
        ? { label: key, ...(value as Partial<FieldDescriptor>) }
        : { label: key };
  }
  return result;
}

/**
 * Validate a value against its field descriptor. Returns a human-readable error, or `null` when the
 * value is acceptable. Mirrors the server's `ConfigSchemaValidator`; empty values only trip the
 * `required` rule (length/pattern rules apply to supplied values only).
 */
export function validateField(
  descriptor: FieldDescriptor | undefined,
  value: string | null | undefined,
): string | null {
  if (!descriptor) return null;
  const trimmed = (value ?? '').trim();
  if (descriptor.required && !trimmed) return `${descriptor.label} is required.`;
  if (!trimmed) return null;
  if (descriptor.minLength != null && trimmed.length < descriptor.minLength)
    return `${descriptor.label} must be at least ${descriptor.minLength} characters.`;
  if (descriptor.maxLength != null && trimmed.length > descriptor.maxLength)
    return `${descriptor.label} must be at most ${descriptor.maxLength} characters.`;
  if (descriptor.options?.length && !descriptor.options.some((o) => o.value === trimmed))
    return descriptor.message ?? `${descriptor.label} is not one of the available choices.`;
  if (descriptor.pattern) {
    try {
      if (!new RegExp(descriptor.pattern).test(trimmed))
        return descriptor.message ?? `${descriptor.label} is invalid.`;
    } catch {
      /* invalid pattern in schema: don't block the user. */
    }
  }
  return null;
}

/** A short human summary of a platform's capabilities, e.g. for chips/tooltips. */
export interface CapabilityChip {
  label: string;
  icon: string;
  /** Whether the capability is present (for muted vs active styling). */
  on: boolean;
}

export function capabilityChips(c: Capabilities): CapabilityChip[] {
  return [
    { label: 'Title', icon: 'bi-fonts', on: c.supportsTitle },
    { label: 'Media', icon: 'bi-images', on: c.supportsMedia },
    { label: 'Threads', icon: 'bi-chat-square-text', on: c.supportsThreads },
    {
      label: c.maxContentLength ? `${c.maxContentLength} chars` : 'No limit',
      icon: 'bi-type',
      on: true,
    },
  ];
}

/** Build a platform → capabilities lookup from the services catalogue. */
export function capabilitiesByPlatform(defs: ServiceDefinition[]): Record<string, Capabilities> {
  const map: Record<string, Capabilities> = {};
  for (const d of defs) {
    map[d.platform] = {
      supportsTitle: d.supportsTitle,
      supportsMedia: d.supportsMedia,
      supportsThreads: d.supportsThreads,
      maxContentLength: d.maxContentLength,
      supportsOAuth: d.supportsOAuth,
      supportsCookiePairing: d.supportsCookiePairing,
      supportsRating: d.supportsRating,
      requiresRating: d.requiresRating,
      supportsMultipleTargets: d.supportsMultipleTargets,
    };
  }
  return map;
}

/** Capabilities for a configured connector, resolved via the catalogue (null if unknown). */
export function capabilitiesForConnector(
  connector: UserConnector,
  byPlatform: Record<string, Capabilities>,
): Capabilities | null {
  return byPlatform[connector.platform] ?? null;
}

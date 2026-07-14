import { Capabilities, ServiceDefinition, UserConnector } from './api.models';

/**
 * Presentation-only metadata for known platforms — branding (icon/colour) and per-field help.
 * This is deliberately NOT capability data: capabilities (title/media/threads/char-limit) come
 * from the API (`/api/services`, sourced from each connector's Describe()). This registry only
 * adds the things an API shouldn't own: iconography and human-friendly field guidance.
 *
 * Keyed by the platform string the API returns. Unknown platforms fall back to sane defaults, so
 * new connectors added server-side still render (just without bespoke branding/help).
 */

export interface FieldMeta {
  label: string;
  help?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'url' | 'tel';
  link?: { href: string; text: string };
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
  /** Field metadata by config/secure field key. */
  fields: Record<string, FieldMeta>;
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
    fields: {
      Webhook: {
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://discord.com/api/webhooks/…',
        help: 'Server Settings → Integrations → Webhooks → New Webhook → Copy URL.',
      },
    },
  },
  Telegram: {
    label: 'Telegram',
    icon: 'bi-telegram',
    color: '#26A5E4',
    blurb: 'Post to Telegram chats or channels as your user account (MTProto).',
    setup:
      'Save the connector first, then use “Log in” on its card to complete the code / 2FA flow.',
    fields: {
      PhoneNumber: {
        label: 'Phone number',
        type: 'tel',
        placeholder: '+1234567890',
        help: 'The phone number of the Telegram account to post as.',
      },
      DefaultPostingTarget: {
        label: 'Default posting target',
        placeholder: '@mychannel or chat id',
        help: 'The chat/channel posts go to by default.',
      },
    },
  },
  BlueSky: {
    label: 'Bluesky',
    icon: 'bi-bluesky',
    color: '#0085FF',
    blurb: 'Post to Bluesky via the AT Protocol.',
    fields: {
      Handle: {
        label: 'Handle',
        placeholder: 'yourname.bsky.social',
        help: 'Your Bluesky handle.',
      },
      AppPassword: {
        label: 'App password',
        type: 'password',
        help: 'Create a dedicated app password — never use your main password.',
        link: {
          href: 'https://bsky.app/settings/app-passwords',
          text: 'bsky.app/settings/app-passwords',
        },
      },
    },
  },
  Tumblr: {
    label: 'Tumblr',
    icon: 'bi-postcard-fill',
    color: '#36465D',
    blurb: 'Post to a Tumblr blog.',
    setup: 'Provide OAuth tokens obtained from authorising the Tumblr application.',
    fields: {
      Username: {
        label: 'Blog username',
        placeholder: 'yourblog',
        help: 'The Tumblr blog to post to.',
      },
      OAuthAccessToken: { label: 'OAuth access token', type: 'password' },
      OAuthRefreshToken: { label: 'OAuth refresh token', type: 'password' },
    },
  },
};

const FALLBACK: PlatformBrand = { label: '', icon: 'bi-plug', color: '#8c57ff', fields: {} };

export function brandFor(platform: string | null | undefined): PlatformBrand {
  if (platform && BRANDS[platform]) return BRANDS[platform];
  return { ...FALLBACK, label: platform || 'Connector' };
}

export function fieldMetaFor(platform: string, key: string): FieldMeta {
  return brandFor(platform).fields[key] ?? { label: key };
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

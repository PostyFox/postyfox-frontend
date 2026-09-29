import { ServiceDefinition } from './api.models';
import { brandFor, capabilitiesByPlatform } from './platforms';
import { darkThemeActive } from './theme';

describe('capabilitiesByPlatform', () => {
  const definition = (platform: string, warning: ServiceDefinition['warning']): ServiceDefinition =>
    ({ id: platform, platform, warning }) as ServiceDefinition;

  it('carries the backend warning through to the platform capabilities', () => {
    const warning = {
      text: 'Terms may not allow this.',
      href: 'https://x.test/tos',
      linkText: 'Terms',
    };

    const caps = capabilitiesByPlatform([definition('X', warning), definition('BlueSky', null)]);

    expect(caps['X'].warning).toEqual(warning);
    expect(caps['BlueSky'].warning).toBeNull();
  });

  it('treats a missing warning as none', () => {
    const caps = capabilitiesByPlatform([definition('Tumblr', undefined as never)]);

    expect(caps['Tumblr'].warning).toBeNull();
  });
});

describe('brandFor', () => {
  it('brands the cookie-paired platforms with their display names', () => {
    expect(brandFor('Kofi').label).toBe('Ko-fi');
    expect(brandFor('Toyhouse').label).toBe('Toyhouse');
  });

  it('points cookie-paired platforms at PostyFox Connect', () => {
    expect(brandFor('Kofi').setup).toContain('PostyFox Connect');
    expect(brandFor('Toyhouse').setup).toContain('PostyFox Connect');
  });

  it('falls back to the platform id for unknown platforms', () => {
    expect(brandFor('Nope').label).toBe('Nope');
    expect(brandFor(null).label).toBe('Connector');
  });
});

describe('brandFor in dark mode', () => {
  afterEach(() => darkThemeActive.set(false));

  it('swaps near-black brand colours for a readable variant, leaving others alone', () => {
    expect(brandFor('X').color).toBe('#14171a');

    darkThemeActive.set(true);

    expect(brandFor('X').color).toBe('#e7e9ea');
    expect(brandFor('DiscordWH').color).toBe('#5865F2');
  });
});

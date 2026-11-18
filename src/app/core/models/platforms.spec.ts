import { ServiceDefinition } from './api.models';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import enGB from '../../../../public/i18n/en-GB.json';
import { translocoTesting } from '../../../testing/transloco-testing';
import { brandFor, capabilitiesByPlatform, contentLength } from './platforms';
import { darkThemeActive } from './theme';

// brandFor() translates its copy, which needs a TranslocoService with en-GB loaded.
beforeEach(() => {
  TestBed.configureTestingModule({ imports: [translocoTesting()] });
  TestBed.inject(TranslocoService);
});

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

describe('platform blurbs', () => {
  // The "Choose a platform" dialog shows each blurb on one line; longer ones get cut off (issue #31).
  const brands = Object.entries(enGB.platforms).filter(
    ([, b]) => typeof b === 'object' && 'blurb' in b,
  ) as [string, { blurb: string }][];
  it.each(brands)('%s blurb fits the connector picker', (_, brand) => {
    expect(brand.blurb.length).toBeLessThanOrEqual(50);
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

describe('contentLength', () => {
  it('counts only the visible text of markdown links and bold on Bluesky', () => {
    const body = '**Hi** [site](https://example.com/a) Sent using [PostyFox](https://postyfox.com)';
    expect(contentLength('BlueSky', body)).toBe('Hi site Sent using PostyFox'.length);
  });

  it('leaves non-http link syntax counted as written on Bluesky', () => {
    expect(contentLength('BlueSky', '[a](relative)')).toBe('[a](relative)'.length);
  });

  it('counts the raw text on other platforms', () => {
    const body = '[site](https://example.com)';
    expect(contentLength('DiscordWH', body)).toBe(body.length);
  });
});

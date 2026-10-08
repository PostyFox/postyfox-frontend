import type { MockedObject } from 'vitest';
import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import {
  MediaRef,
  PostContent,
  ServiceDefinition,
  UserConnector,
} from '../../core/models/api.models';
import { ConnectorsService } from '../../core/services/connectors.service';
import { MediaService } from '../../core/services/media.service';
import { PostsService } from '../../core/services/posts.service';
import { ServicesService } from '../../core/services/services.service';
import { TagPresetsService } from '../../core/services/tag-presets.service';
import { TemplatesService } from '../../core/services/templates.service';
import { TextTemplatesService } from '../../core/services/text-templates.service';
import { ToastService } from '../../core/services/toast.service';
import { ComposeComponent } from './compose.component';
import { translocoTesting } from '../../../testing/transloco-testing';

/**
 * Covers issue #335 (default image selection for multi-image posts): the default must be
 * changeable at any time before submit, deleting the default must promote the next remaining
 * image, and exactly one item is ever flagged default whenever media is attached.
 */
describe('ComposeComponent — default media selection', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mastodonConnector: UserConnector = {
    id: 'conn-1',
    serviceDefinitionId: 'Mastodon',
    platform: 'Mastodon',
    displayName: 'My Mastodon',
    configJson: '{}',
    enabled: true,
    defaultIncludeTags: true,
    defaultRating: null,
  };

  const mastodonDefinition: ServiceDefinition = {
    id: 'Mastodon',
    name: 'Mastodon',
    enabled: true,
    configSchema: '{}',
    secureConfigSchema: null,
    postOptionsSchema: null,
    platform: 'Mastodon',
    supportsTitle: true,
    supportsMedia: true,
    supportsThreads: true,
    maxContentLength: 500,
    supportsOAuth: true,
    supportsCookiePairing: false,
    supportsRating: false,
    requiresRating: false,
    supportsTags: false,
    requiresTags: false,
    minTags: 0,
    requiresMedia: false,
    supportsTextOnly: false,
    warning: null,
    supportsMultipleTargets: false,
    supportsContentWarning: true,
    supportsRepost: true,
    supportsDelete: true,
  };

  let media: Pick<MockedObject<MediaService>, 'upload' | 'getLimits'>;
  let connectors: Pick<
    MockedObject<ConnectorsService>,
    'list' | 'listAllDestinations' | 'checkMedia'
  >;
  let router: Pick<MockedObject<Router>, 'getCurrentNavigation' | 'navigate'>;
  let uploadedRefs: MediaRef[];

  /** Uploads one file synchronously (the mocked services resolve inline) and flushes the fixture. */
  function upload(fixture: ComponentFixture<ComposeComponent>, name: string): Promise<void> {
    const file = new File(['x'], name, { type: 'image/png' });
    const ref: MediaRef = { container: 'media', key: `u/${name}`, contentType: 'image/png' };
    uploadedRefs.push(ref);
    media.upload.mockReturnValue(
      of(new HttpResponse({ body: ref, status: 200, statusText: 'OK' })),
    );
    fixture.componentInstance.onFilesSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);
    // The pre-flight decodes image dimensions asynchronously before the upload starts.
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  function configure(prefill?: PostContent): ComponentFixture<ComposeComponent> {
    // Stub the pixel-dimension decode the upload pre-flight runs (the fake files aren't real images),
    // so it settles as a pending task and fixture.whenStable() can wait for it.
    // jsdom has no createImageBitmap, so stub the global rather than spying on it.
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: () => undefined } as ImageBitmap),
    );

    uploadedRefs = [];
    media = {
      upload: vi.fn().mockName('MediaService.upload'),
      getLimits: vi.fn().mockName('MediaService.getLimits'),
    };
    media.getLimits.mockReturnValue(of({ maxUploadSizeBytes: null }));
    connectors = {
      list: vi.fn().mockName('ConnectorsService.list'),
      listAllDestinations: vi.fn().mockName('ConnectorsService.listAllDestinations'),
      checkMedia: vi.fn().mockName('ConnectorsService.checkMedia'),
    };
    connectors.list.mockReturnValue(of([mastodonConnector]));
    connectors.listAllDestinations.mockReturnValue(of([]));
    connectors.checkMedia.mockReturnValue(of([]));

    router = {
      getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation'),
      navigate: vi.fn().mockName('Router.navigate'),
    };
    router.getCurrentNavigation.mockReturnValue(
      prefill
        ? ({ extras: { state: { prefill } } } as unknown as ReturnType<
            Router['getCurrentNavigation']
          >)
        : null,
    );

    TestBed.configureTestingModule({
      imports: [ComposeComponent, translocoTesting()],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: {
            list: vi.fn().mockName('TemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TagPresetsService,
          useValue: {
            list: vi.fn().mockName('TagPresetsService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TextTemplatesService,
          useValue: {
            list: vi.fn().mockName('TextTemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: vi
              .fn()
              .mockName('ServicesService.list')
              .mockReturnValue(of([mastodonDefinition])),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: vi.fn().mockName('PostsService.create'),
            updateDraft: vi.fn().mockName('PostsService.updateDraft'),
            publish: vi.fn().mockName('PostsService.publish'),
            list: vi.fn().mockName('PostsService.list'),
          },
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn().mockName('ToastService.success'),
            error: vi.fn().mockName('ToastService.error'),
            warning: vi.fn().mockName('ToastService.warning'),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges(); // resolves the constructor's forkJoin and (if any) applyPrefill
    return fixture;
  }

  it('flags the first uploaded image as the default', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');

    const items = fixture.componentInstance.mediaItems();
    expect(items.length).toBe(1);
    expect(items[0].isDefault).toBe(true);
  });

  it('does not disturb an existing default when later images are uploaded', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    await upload(fixture, 'b.png');
    await upload(fixture, 'c.png');

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.isDefault)).toEqual([true, false, false]);
  });

  it('lets the user change the default to any attached image at any time', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    await upload(fixture, 'b.png');
    await upload(fixture, 'c.png');

    fixture.componentInstance.setDefaultMedia(2);

    expect(fixture.componentInstance.mediaItems().map((i) => i.isDefault)).toEqual([
      false,
      false,
      true,
    ]);

    // And back again — nothing pins the choice once made.
    fixture.componentInstance.setDefaultMedia(0);
    expect(fixture.componentInstance.mediaItems().map((i) => i.isDefault)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('promotes the next remaining image when the default is deleted', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    await upload(fixture, 'b.png');
    await upload(fixture, 'c.png');
    fixture.componentInstance.setDefaultMedia(1); // b.png is default

    fixture.componentInstance.removeMedia(1); // delete it
    fixture.detectChanges();

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.name)).toEqual(['a.png', 'c.png']);
    expect(items.map((i) => i.isDefault)).toEqual([true, false]);
  });

  it('leaves the default untouched when a non-default image is deleted', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    await upload(fixture, 'b.png');
    await upload(fixture, 'c.png');
    fixture.componentInstance.setDefaultMedia(2); // c.png is default

    fixture.componentInstance.removeMedia(0); // delete a.png, not the default
    fixture.detectChanges();

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.name)).toEqual(['b.png', 'c.png']);
    expect(items.map((i) => i.isDefault)).toEqual([false, true]);
  });

  it('leaves no default at all once the last image is removed, and re-defaults cleanly on re-upload', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    fixture.componentInstance.removeMedia(0);
    fixture.detectChanges();

    expect(fixture.componentInstance.mediaItems()).toEqual([]);

    await upload(fixture, 'b.png');
    expect(fixture.componentInstance.mediaItems()[0].isDefault).toBe(true);
  });

  it('restores the default flagged in prefilled content (edit draft / post again)', () => {
    const prefillMedia: MediaRef[] = [
      { container: 'media', key: 'u/a.png', contentType: 'image/png', isDefault: false },
      { container: 'media', key: 'u/b.png', contentType: 'image/png', isDefault: true },
    ];
    const fixture = configure({
      title: null,
      description: null,
      htmlDescription: null,
      tags: [],
      media: prefillMedia,
      templateId: null,
      variables: {},
      connectorIds: ['conn-1'],
      postAt: null,
      targetOptions: {},
      targetIncludeTags: {},
      targetRating: {},
      targetAutomations: {},
    });

    expect(fixture.componentInstance.mediaItems().map((i) => i.isDefault)).toEqual([false, true]);
  });

  it('falls back to the first item when prefilled content carries no default at all', () => {
    const prefillMedia: MediaRef[] = [
      { container: 'media', key: 'u/a.png', contentType: 'image/png', isDefault: false },
      { container: 'media', key: 'u/b.png', contentType: 'image/png', isDefault: false },
    ];
    const fixture = configure({
      title: null,
      description: null,
      htmlDescription: null,
      tags: [],
      media: prefillMedia,
      templateId: null,
      variables: {},
      connectorIds: ['conn-1'],
      postAt: null,
      targetOptions: {},
      targetIncludeTags: {},
      targetRating: {},
      targetAutomations: {},
    });

    expect(fixture.componentInstance.mediaItems().map((i) => i.isDefault)).toEqual([true, false]);
  });

  /** The "Media" card specifically — several other cards reuse the same `.border.rounded` row styling. */
  function mediaCard(fixture: ComponentFixture<ComposeComponent>): HTMLElement {
    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.card'),
    ) as HTMLElement[];
    const card = cards.find((c) => c.querySelector('.card-title')?.textContent?.trim() === 'Media');
    if (!card) throw new Error('Media card not found');
    return card;
  }

  it('renders a "Default" badge on the default item and a "Set as default" button on the others', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');
    await upload(fixture, 'b.png');

    const rows = mediaCard(fixture).querySelectorAll('.border.rounded');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Default');
    expect(rows[0].textContent).not.toContain('Set as default');
    expect(rows[1].textContent).not.toContain('Default');
    expect(rows[1].textContent).toContain('Set as default');

    const setDefaultButton = Array.from(rows[1].querySelectorAll('button')).find((b) =>
      (b as HTMLElement).textContent?.includes('Set as default'),
    ) as HTMLButtonElement;
    setDefaultButton.click();
    fixture.detectChanges();

    expect(rows[0].textContent).not.toContain('Default');
    expect(rows[0].textContent).toContain('Set as default');
    expect(rows[1].textContent).toContain('Default');
    expect(rows[1].textContent).not.toContain('Set as default');
  });

  it('shows no "Set as default" control at all with only one image attached', async () => {
    const fixture = configure();
    await upload(fixture, 'a.png');

    expect(mediaCard(fixture).textContent).not.toContain('Set as default');
  });
});

/**
 * Covers issue #333 (faster upload feedback): a file over the gateway's reported cap
 * (`GET /api/media/limits`) is rejected the moment it's selected — no request at all, so it never
 * reaches `MediaService.upload` — instead of only failing after a full, possibly slow, transfer.
 */
describe('ComposeComponent — client-side upload size cap', () => {
  afterEach(() => vi.unstubAllGlobals());

  const connector: UserConnector = {
    id: 'conn-1',
    serviceDefinitionId: 'Mastodon',
    platform: 'Mastodon',
    displayName: 'My Mastodon',
    configJson: '{}',
    enabled: true,
    defaultIncludeTags: true,
    defaultRating: null,
  };

  const definition: ServiceDefinition = {
    id: 'Mastodon',
    name: 'Mastodon',
    enabled: true,
    configSchema: '{}',
    secureConfigSchema: null,
    postOptionsSchema: null,
    platform: 'Mastodon',
    supportsTitle: true,
    supportsMedia: true,
    supportsThreads: true,
    maxContentLength: 500,
    supportsOAuth: true,
    supportsCookiePairing: false,
    supportsRating: false,
    requiresRating: false,
    supportsTags: false,
    requiresTags: false,
    minTags: 0,
    requiresMedia: false,
    supportsTextOnly: false,
    warning: null,
    supportsMultipleTargets: false,
    supportsContentWarning: true,
    supportsRepost: true,
    supportsDelete: true,
  };

  let media: Pick<MockedObject<MediaService>, 'upload' | 'getLimits'>;

  function configure(maxUploadSizeBytes: number | null): ComponentFixture<ComposeComponent> {
    // Stub the pixel-dimension decode the upload pre-flight runs (the fake files aren't real images),
    // so it settles as a pending task and fixture.whenStable() can wait for it.
    // jsdom has no createImageBitmap, so stub the global rather than spying on it.
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: () => undefined } as ImageBitmap),
    );

    media = {
      upload: vi.fn().mockName('MediaService.upload'),
      getLimits: vi.fn().mockName('MediaService.getLimits'),
    };
    media.getLimits.mockReturnValue(of({ maxUploadSizeBytes }));

    const connectors = {
      list: vi.fn().mockName('ConnectorsService.list'),
      listAllDestinations: vi.fn().mockName('ConnectorsService.listAllDestinations'),
      checkMedia: vi.fn().mockName('ConnectorsService.checkMedia'),
    };
    connectors.list.mockReturnValue(of([connector]));
    connectors.listAllDestinations.mockReturnValue(of([]));
    connectors.checkMedia.mockReturnValue(of([]));

    const router = {
      getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation'),
      navigate: vi.fn().mockName('Router.navigate'),
    };
    router.getCurrentNavigation.mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [ComposeComponent, translocoTesting()],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: {
            list: vi.fn().mockName('TemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TagPresetsService,
          useValue: {
            list: vi.fn().mockName('TagPresetsService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TextTemplatesService,
          useValue: {
            list: vi.fn().mockName('TextTemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: vi
              .fn()
              .mockName('ServicesService.list')
              .mockReturnValue(of([definition])),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: vi.fn().mockName('PostsService.create'),
            updateDraft: vi.fn().mockName('PostsService.updateDraft'),
            publish: vi.fn().mockName('PostsService.publish'),
            list: vi.fn().mockName('PostsService.list'),
          },
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn().mockName('ToastService.success'),
            error: vi.fn().mockName('ToastService.error'),
            warning: vi.fn().mockName('ToastService.warning'),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges();
    return fixture;
  }

  function select(
    fixture: ComponentFixture<ComposeComponent>,
    name: string,
    size: number,
  ): Promise<void> {
    const file = new File([new Uint8Array(size)], name, { type: 'image/png' });
    fixture.componentInstance.onFilesSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);
    // The pre-flight decodes image dimensions asynchronously before the upload starts.
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  it('rejects an oversized file immediately, without ever calling MediaService.upload', async () => {
    const fixture = configure(1000000);
    await select(fixture, 'big.png', 2000000);

    const tasks = fixture.componentInstance.uploadTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].status).toBe('error');
    expect(tasks[0].error).toContain('exceeds');
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('uploads a file within the cap as normal', async () => {
    const fixture = configure(1000000);
    media.upload.mockReturnValue(
      of(
        new HttpResponse({
          body: { container: 'media', key: 'u/ok.png', contentType: 'image/png' },
          status: 200,
          statusText: 'OK',
        }),
      ),
    );

    await select(fixture, 'ok.png', 500000);

    expect(media.upload).toHaveBeenCalled();
    expect(fixture.componentInstance.uploadTasks().length).toBe(0);
    expect(fixture.componentInstance.mediaItems().length).toBe(1);
  });

  it('applies no cap at all when the endpoint reports none configured', async () => {
    const fixture = configure(null);
    media.upload.mockReturnValue(
      of(
        new HttpResponse({
          body: { container: 'media', key: 'u/huge.png', contentType: 'image/png' },
          status: 200,
          statusText: 'OK',
        }),
      ),
    );

    await select(fixture, 'huge.png', 500000000);

    expect(media.upload).toHaveBeenCalled();
  });

  it('retrying an oversized file re-applies the cap rather than forcing the upload through', async () => {
    const fixture = configure(1000000);
    await select(fixture, 'big.png', 2000000);

    const id = fixture.componentInstance.uploadTasks()[0].id;
    fixture.componentInstance.retryUpload(id);
    fixture.detectChanges();

    expect(fixture.componentInstance.uploadTasks()[0].status).toBe('error');
    expect(media.upload).not.toHaveBeenCalled();
  });
});

/**
 * Covers issue #387 (Instagram): a platform that declares `requiresMedia` (Instagram has no
 * text-only post type) blocks submission until at least one media item is attached, surfaced the
 * same way `requiresTags`/`requiresRating` already are for other platforms.
 */
describe('ComposeComponent — media-required platforms (Instagram)', () => {
  const igConnector: UserConnector = {
    id: 'conn-ig',
    serviceDefinitionId: 'Instagram',
    platform: 'Instagram',
    displayName: 'My Instagram',
    configJson: '{}',
    enabled: true,
    defaultIncludeTags: true,
    defaultRating: null,
  };

  const igDefinition: ServiceDefinition = {
    id: 'Instagram',
    name: 'Instagram',
    enabled: true,
    configSchema: '{}',
    secureConfigSchema: null,
    postOptionsSchema: null,
    platform: 'Instagram',
    supportsTitle: false,
    supportsMedia: true,
    supportsThreads: false,
    maxContentLength: 2200,
    supportsOAuth: true,
    supportsCookiePairing: false,
    supportsRating: false,
    requiresRating: false,
    supportsTags: false,
    requiresTags: false,
    minTags: 0,
    requiresMedia: true,
    supportsTextOnly: false,
    warning: null,
    supportsMultipleTargets: false,
    supportsContentWarning: false,
    supportsRepost: false,
    supportsDelete: false,
  };

  function configure(): ComponentFixture<ComposeComponent> {
    const media = {
      upload: vi.fn().mockName('MediaService.upload'),
      getLimits: vi.fn().mockName('MediaService.getLimits'),
    };
    media.getLimits.mockReturnValue(of({ maxUploadSizeBytes: null }));

    const connectors = {
      list: vi.fn().mockName('ConnectorsService.list'),
      listAllDestinations: vi.fn().mockName('ConnectorsService.listAllDestinations'),
      checkMedia: vi.fn().mockName('ConnectorsService.checkMedia'),
    };
    connectors.list.mockReturnValue(of([igConnector]));
    connectors.listAllDestinations.mockReturnValue(of([]));
    connectors.checkMedia.mockReturnValue(of([]));

    const router = {
      getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation'),
      navigate: vi.fn().mockName('Router.navigate'),
    };
    router.getCurrentNavigation.mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [ComposeComponent, translocoTesting()],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: {
            list: vi.fn().mockName('TemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TagPresetsService,
          useValue: {
            list: vi.fn().mockName('TagPresetsService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TextTemplatesService,
          useValue: {
            list: vi.fn().mockName('TextTemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: vi
              .fn()
              .mockName('ServicesService.list')
              .mockReturnValue(of([igDefinition])),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: vi.fn().mockName('PostsService.create'),
            updateDraft: vi.fn().mockName('PostsService.updateDraft'),
            publish: vi.fn().mockName('PostsService.publish'),
            list: vi.fn().mockName('PostsService.list'),
          },
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn().mockName('ToastService.success'),
            error: vi.fn().mockName('ToastService.error'),
            warning: vi.fn().mockName('ToastService.warning'),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleTarget(igConnector.id);
    fixture.detectChanges();
    return fixture;
  }

  it('blocks submission when a media-required target has no media attached', () => {
    const fixture = configure();

    expect(fixture.componentInstance.mediaRequiredIssues()).toEqual(['My Instagram']);
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('allows submission once media is attached', () => {
    const fixture = configure();
    fixture.componentInstance.mediaItems.set([
      {
        ref: { container: 'media', key: 'u/a.png', contentType: 'image/png' },
        name: 'a.png',
        alt: '',
        mimeType: 'image/png',
        isDefault: true,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.mediaRequiredIssues()).toEqual([]);
  });
});

/** FurAffinity posts a journal when no image is attached: no tags, rating or image required. */
describe('ComposeComponent — text-only posts (FurAffinity journals)', () => {
  const faConnector: UserConnector = {
    id: 'conn-fa',
    serviceDefinitionId: 'FurAffinity',
    platform: 'FurAffinity',
    displayName: 'My FA',
    configJson: '{}',
    enabled: true,
    defaultIncludeTags: true,
    defaultRating: null,
  };

  const faDefinition: ServiceDefinition = {
    id: 'FurAffinity',
    name: 'FurAffinity',
    enabled: true,
    configSchema: '{}',
    secureConfigSchema: null,
    postOptionsSchema: null,
    platform: 'FurAffinity',
    supportsTitle: true,
    supportsMedia: true,
    supportsThreads: false,
    maxContentLength: null,
    supportsOAuth: false,
    supportsCookiePairing: true,
    supportsRating: true,
    requiresRating: true,
    supportsTags: true,
    requiresTags: true,
    minTags: 1,
    requiresMedia: false,
    supportsTextOnly: true,
    warning: null,
    supportsMultipleTargets: false,
    supportsContentWarning: false,
    supportsRepost: false,
    supportsDelete: false,
  };

  function configure(): ComponentFixture<ComposeComponent> {
    const media = {
      upload: vi.fn().mockName('MediaService.upload'),
      getLimits: vi.fn().mockName('MediaService.getLimits'),
    };
    media.getLimits.mockReturnValue(of({ maxUploadSizeBytes: null }));
    const connectors = {
      list: vi.fn().mockName('ConnectorsService.list'),
      listAllDestinations: vi.fn().mockName('ConnectorsService.listAllDestinations'),
      checkMedia: vi.fn().mockName('ConnectorsService.checkMedia'),
    };
    connectors.list.mockReturnValue(of([faConnector]));
    connectors.listAllDestinations.mockReturnValue(of([]));
    connectors.checkMedia.mockReturnValue(of([]));
    const router = {
      getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation'),
      navigate: vi.fn().mockName('Router.navigate'),
    };
    router.getCurrentNavigation.mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [ComposeComponent, translocoTesting()],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: {
            list: vi.fn().mockName('TemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TagPresetsService,
          useValue: {
            list: vi.fn().mockName('TagPresetsService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TextTemplatesService,
          useValue: {
            list: vi.fn().mockName('TextTemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: vi
              .fn()
              .mockName('ServicesService.list')
              .mockReturnValue(of([faDefinition])),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: vi.fn().mockName('PostsService.create'),
            updateDraft: vi.fn().mockName('PostsService.updateDraft'),
            publish: vi.fn().mockName('PostsService.publish'),
            list: vi.fn().mockName('PostsService.list'),
          },
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn().mockName('ToastService.success'),
            error: vi.fn().mockName('ToastService.error'),
            warning: vi.fn().mockName('ToastService.warning'),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleTarget(faConnector.id);
    fixture.detectChanges();
    return fixture;
  }

  it('waives tags, rating and image for a post with no media, keeping the title check', () => {
    const cmp = configure().componentInstance;

    expect(cmp.tagsRequiredIssues()).toEqual([]);
    expect(cmp.ratingRequiredIssues()).toEqual([]);
    expect(cmp.furAffinityIssues()).toEqual(['Add a title.']);

    cmp.title.set('News');
    expect(cmp.furAffinityIssues()).toEqual([]);
  });

  it('requires tags, rating and the image checks once media is attached', () => {
    const cmp = configure().componentInstance;
    cmp.title.set('Art');
    cmp.mediaItems.set([
      {
        ref: { container: 'media', key: 'u/a.webp', contentType: 'image/webp' },
        name: 'a.webp',
        alt: '',
        mimeType: 'image/webp',
        isDefault: true,
      },
    ]);

    expect(cmp.tagsRequiredIssues()).toEqual(['My FA']);
    expect(cmp.ratingRequiredIssues()).toEqual(['My FA']);
    expect(cmp.furAffinityIssues()).toEqual([
      'Use a JPEG, PNG, or GIF image for the default image.',
      'Add at least three tags of three or more characters.',
    ]);
  });
});

/** Artconomy needs five distinct tags and one image for a submission; text-only posts become journals. */
describe('ComposeComponent — Artconomy', () => {
  const acConnector: UserConnector = {
    id: 'conn-ac',
    serviceDefinitionId: 'Artconomy',
    platform: 'Artconomy',
    displayName: 'My AC',
    configJson: '{}',
    enabled: true,
    defaultIncludeTags: true,
    defaultRating: null,
  };

  const acDefinition: ServiceDefinition = {
    id: 'Artconomy',
    name: 'Artconomy',
    enabled: true,
    configSchema: '{}',
    secureConfigSchema: null,
    postOptionsSchema: null,
    platform: 'Artconomy',
    supportsTitle: true,
    supportsMedia: true,
    supportsThreads: false,
    maxContentLength: 2000,
    supportsOAuth: false,
    supportsCookiePairing: true,
    supportsRating: true,
    requiresRating: true,
    supportsTags: true,
    requiresTags: true,
    minTags: 5,
    requiresMedia: false,
    supportsTextOnly: true,
    warning: null,
    supportsMultipleTargets: false,
    supportsContentWarning: false,
    supportsRepost: false,
    supportsDelete: false,
  };

  function image(name: string, mimeType = 'image/png') {
    return {
      ref: { container: 'media', key: `u/${name}`, contentType: mimeType },
      name,
      alt: '',
      mimeType,
    } as ReturnType<ComposeComponent['mediaItems']>[number];
  }

  function configure(): ComponentFixture<ComposeComponent> {
    const media = {
      upload: vi.fn().mockName('MediaService.upload'),
      getLimits: vi
        .fn()
        .mockName('MediaService.getLimits')
        .mockReturnValue(of({ maxUploadSizeBytes: null })),
    };
    const connectors = {
      list: vi
        .fn()
        .mockName('ConnectorsService.list')
        .mockReturnValue(of([acConnector])),
      listAllDestinations: vi
        .fn()
        .mockName('ConnectorsService.listAllDestinations')
        .mockReturnValue(of([])),
      checkMedia: vi.fn().mockName('ConnectorsService.checkMedia').mockReturnValue(of([])),
    };
    const router = {
      getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation').mockReturnValue(null),
      navigate: vi.fn().mockName('Router.navigate'),
    };

    TestBed.configureTestingModule({
      imports: [ComposeComponent, translocoTesting()],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: {
            list: vi.fn().mockName('TemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TagPresetsService,
          useValue: {
            list: vi.fn().mockName('TagPresetsService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: TextTemplatesService,
          useValue: {
            list: vi.fn().mockName('TextTemplatesService.list').mockReturnValue(of([])),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: vi
              .fn()
              .mockName('ServicesService.list')
              .mockReturnValue(of([acDefinition])),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: vi.fn().mockName('PostsService.create'),
            updateDraft: vi.fn().mockName('PostsService.updateDraft'),
            publish: vi.fn().mockName('PostsService.publish'),
            list: vi.fn().mockName('PostsService.list'),
          },
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn().mockName('ToastService.success'),
            error: vi.fn().mockName('ToastService.error'),
            warning: vi.fn().mockName('ToastService.warning'),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleTarget(acConnector.id);
    fixture.detectChanges();
    return fixture;
  }

  it('waives the tag minimum for a journal, but needs a title', () => {
    const cmp = configure().componentInstance;

    expect(cmp.tagsRequiredIssues()).toEqual([]);
    expect(cmp.artconomyIssues()).toEqual([
      'Add a title: a post with no image becomes a journal, which needs one.',
    ]);

    cmp.title.set('News');
    expect(cmp.artconomyIssues()).toEqual([]);
    expect(cmp.canSubmit()).toBe(true);
  });

  it('needs five distinct tags once an image is attached', () => {
    const cmp = configure().componentInstance;
    cmp.mediaItems.set([image('a.png')]);

    cmp.tags.set('fox, art, Fox, sketch, ');
    expect(cmp.distinctTagCount()).toBe(3);
    expect(cmp.tagsRequiredIssues()).toEqual(['My AC']);

    cmp.tags.set('fox, art, sketch, digital, commission');
    expect(cmp.tagsRequiredIssues()).toEqual([]);
  });

  it('rejects more than one image and over-long titles before posting', () => {
    const cmp = configure().componentInstance;
    cmp.title.set('x'.repeat(101));
    cmp.mediaItems.set([image('a.png'), image('b.png')]);

    expect(cmp.artconomyIssues()).toEqual([
      'Keep the title to 100 characters or fewer.',
      'Attach only one image: an Artconomy submission is a single file.',
    ]);
    expect(cmp.canSubmit()).toBe(false);
  });

  it('accepts a WebP image', () => {
    const cmp = configure().componentInstance;
    cmp.mediaItems.set([image('a.webp', 'image/webp')]);
    expect(cmp.artconomyIssues()).toEqual([]);
  });
});

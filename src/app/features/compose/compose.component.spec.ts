import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import {
  ContentRating,
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

/**
 * Covers issue #335 (default image selection for multi-image posts): the default must be
 * changeable at any time before submit, deleting the default must promote the next remaining
 * image, and exactly one item is ever flagged default whenever media is attached.
 */
describe('ComposeComponent — default media selection', () => {
  const mastodonConnector: UserConnector = {
    id: 'conn-1',
    serviceDefinitionId: 'Mastodon',
    platform: 'Mastodon',
    displayName: 'My Mastodon',
    configJson: '{}',
    enabled: true,
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
    supportsMultipleTargets: false,
    supportsContentWarning: true,
  };

  let media: jasmine.SpyObj<MediaService>;
  let connectors: jasmine.SpyObj<ConnectorsService>;
  let router: jasmine.SpyObj<Router>;
  let uploadedRefs: MediaRef[];

  /** Uploads one file synchronously (the mocked services resolve inline) and flushes the fixture. */
  function upload(fixture: ComponentFixture<ComposeComponent>, name: string): void {
    const file = new File(['x'], name, { type: 'image/png' });
    const ref: MediaRef = { container: 'media', key: `u/${name}`, contentType: 'image/png' };
    uploadedRefs.push(ref);
    media.upload.and.returnValue(of(ref));
    fixture.componentInstance.onFilesSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);
    fixture.detectChanges();
  }

  function configure(prefill?: PostContent): ComponentFixture<ComposeComponent> {
    uploadedRefs = [];
    media = jasmine.createSpyObj<MediaService>('MediaService', ['upload']);
    connectors = jasmine.createSpyObj<ConnectorsService>('ConnectorsService', [
      'list',
      'listAllDestinations',
      'checkMedia',
    ]);
    connectors.list.and.returnValue(of([mastodonConnector]));
    connectors.listAllDestinations.and.returnValue(of([]));
    connectors.checkMedia.and.returnValue(of([]));

    router = jasmine.createSpyObj<Router>('Router', ['getCurrentNavigation', 'navigate']);
    router.getCurrentNavigation.and.returnValue(
      prefill
        ? ({ extras: { state: { prefill } } } as unknown as ReturnType<
            Router['getCurrentNavigation']
          >)
        : null,
    );

    TestBed.configureTestingModule({
      imports: [ComposeComponent],
      providers: [
        { provide: ConnectorsService, useValue: connectors },
        {
          provide: TemplatesService,
          useValue: jasmine.createSpyObj<TemplatesService>('TemplatesService', {
            list: of([]),
          }),
        },
        {
          provide: TagPresetsService,
          useValue: jasmine.createSpyObj<TagPresetsService>('TagPresetsService', { list: of([]) }),
        },
        {
          provide: TextTemplatesService,
          useValue: jasmine.createSpyObj<TextTemplatesService>('TextTemplatesService', {
            list: of([]),
          }),
        },
        {
          provide: ServicesService,
          useValue: jasmine.createSpyObj<ServicesService>('ServicesService', {
            list: of([mastodonDefinition]),
          }),
        },
        {
          provide: PostsService,
          useValue: jasmine.createSpyObj<PostsService>('PostsService', [
            'create',
            'updateDraft',
            'publish',
            'list',
          ]),
        },
        { provide: MediaService, useValue: media },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', [
            'success',
            'error',
            'warning',
          ]),
        },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(ComposeComponent);
    fixture.detectChanges(); // resolves the constructor's forkJoin and (if any) applyPrefill
    return fixture;
  }

  it('flags the first uploaded image as the default', () => {
    const fixture = configure();
    upload(fixture, 'a.png');

    const items = fixture.componentInstance.mediaItems();
    expect(items.length).toBe(1);
    expect(items[0].isDefault).toBeTrue();
  });

  it('does not disturb an existing default when later images are uploaded', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    upload(fixture, 'b.png');
    upload(fixture, 'c.png');

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.isDefault)).toEqual([true, false, false]);
  });

  it('lets the user change the default to any attached image at any time', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    upload(fixture, 'b.png');
    upload(fixture, 'c.png');

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

  it('promotes the next remaining image when the default is deleted', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    upload(fixture, 'b.png');
    upload(fixture, 'c.png');
    fixture.componentInstance.setDefaultMedia(1); // b.png is default

    fixture.componentInstance.removeMedia(1); // delete it
    fixture.detectChanges();

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.name)).toEqual(['a.png', 'c.png']);
    expect(items.map((i) => i.isDefault)).toEqual([true, false]);
  });

  it('leaves the default untouched when a non-default image is deleted', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    upload(fixture, 'b.png');
    upload(fixture, 'c.png');
    fixture.componentInstance.setDefaultMedia(2); // c.png is default

    fixture.componentInstance.removeMedia(0); // delete a.png, not the default
    fixture.detectChanges();

    const items = fixture.componentInstance.mediaItems();
    expect(items.map((i) => i.name)).toEqual(['b.png', 'c.png']);
    expect(items.map((i) => i.isDefault)).toEqual([false, true]);
  });

  it('leaves no default at all once the last image is removed, and re-defaults cleanly on re-upload', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    fixture.componentInstance.removeMedia(0);
    fixture.detectChanges();

    expect(fixture.componentInstance.mediaItems()).toEqual([]);

    upload(fixture, 'b.png');
    expect(fixture.componentInstance.mediaItems()[0].isDefault).toBeTrue();
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
      rating: ContentRating.General,
      targetOptions: {},
      targetIncludeTags: {},
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
      rating: ContentRating.General,
      targetOptions: {},
      targetIncludeTags: {},
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

  it('renders a "Default" badge on the default item and a "Set as default" button on the others', () => {
    const fixture = configure();
    upload(fixture, 'a.png');
    upload(fixture, 'b.png');

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

  it('shows no "Set as default" control at all with only one image attached', () => {
    const fixture = configure();
    upload(fixture, 'a.png');

    expect(mediaCard(fixture).textContent).not.toContain('Set as default');
  });
});

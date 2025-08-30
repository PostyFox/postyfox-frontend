import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MarkdownModule } from 'ngx-markdown';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PostComponent } from './post.component';
import { ServicesService } from '../services/services.service';
import { ApiTokenService } from '../services/api-token.service';
import { APIKey, PostRequest, PostResponse } from '../services/api-models';

describe('PostComponent', () => {
    let component: PostComponent;
    let fixture: ComponentFixture<PostComponent>;
    let servicesService: jasmine.SpyObj<ServicesService>;
    let apiTokenService: jasmine.SpyObj<ApiTokenService>;

    const mockAPIKey: APIKey = new APIKey('test-id-123', 'test-api-key-456', 'test-user-789');
    const mockAPIKeys: APIKey[] = [mockAPIKey, new APIKey('test-id-456', 'test-api-key-789', 'test-user-789')];

    const mockPostResponse: PostResponse = new PostResponse('post-123', 1, 'https://example.com/media');

    const mockUserServices = [
        { serviceName: 'Twitter', id: '1', serviceID: 'twitter' },
        { serviceName: 'Facebook', id: '2', serviceID: 'facebook' },
    ];

    beforeEach(async () => {
        const servicesServiceSpy = jasmine.createSpyObj('ServicesService', ['getUserServices', 'createNewPost']);
        const apiTokenServiceSpy = jasmine.createSpyObj('ApiTokenService', ['getAPITokens', 'generateToken']);

        await TestBed.configureTestingModule({
            declarations: [PostComponent],
            imports: [ReactiveFormsModule, FormsModule, HttpClientTestingModule, MarkdownModule.forRoot()],
            providers: [
                FormBuilder,
                { provide: ServicesService, useValue: servicesServiceSpy },
                { provide: ApiTokenService, useValue: apiTokenServiceSpy },
            ],
            schemas: [NO_ERRORS_SCHEMA], // This will ignore unknown elements in template
        }).compileComponents();

        servicesService = TestBed.inject(ServicesService) as jasmine.SpyObj<ServicesService>;
        apiTokenService = TestBed.inject(ApiTokenService) as jasmine.SpyObj<ApiTokenService>;

        // Setup default mock returns
        servicesService.getUserServices.and.returnValue(of(mockUserServices));
        apiTokenService.getAPITokens.and.returnValue(of(mockAPIKeys));
        servicesService.createNewPost.and.returnValue(of(mockPostResponse));
        apiTokenService.generateToken.and.returnValue(of(mockAPIKey));

        fixture = TestBed.createComponent(PostComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should load user services and API tokens on init', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(servicesService.getUserServices).toHaveBeenCalled();
            expect(apiTokenService.getAPITokens).toHaveBeenCalled();
            expect(component.userServices).toEqual(mockUserServices);
            expect(component.userApiTokens).toEqual(mockAPIKeys);
            expect(component.selectedApiToken).toEqual(mockAPIKeys[0]);
        }));

        it('should handle errors when loading user services', fakeAsync(() => {
            spyOn(console, 'error');
            servicesService.getUserServices.and.returnValue(throwError(() => new Error('Service error')));

            fixture.detectChanges();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error fetching user services:', jasmine.any(Error));
        }));

        it('should handle errors when loading API tokens', fakeAsync(() => {
            spyOn(console, 'error');
            apiTokenService.getAPITokens.and.returnValue(throwError(() => new Error('Token error')));

            fixture.detectChanges();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error fetching API tokens:', jasmine.any(Error));
        }));

        it('should not select a token if no tokens are available', fakeAsync(() => {
            apiTokenService.getAPITokens.and.returnValue(of([]));

            fixture.detectChanges();
            tick();

            expect(component.selectedApiToken).toBeNull();
        }));

        it('should initialize form with default values', () => {
            fixture.detectChanges();

            expect(component.templateForm).toBeDefined();
            expect(component.templateForm.get('title')?.value).toBe('');
            expect(component.templateForm.get('tags')?.value).toBe('');
            expect(component.templateForm.get('isPreview')?.value).toBe(true);
        });
    });

    describe('form building', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should build form with all required fields', () => {
            const form = component.templateForm;

            expect(form.get('title')).toBeDefined();
            expect(form.get('body')).toBeDefined();
            expect(form.get('htmlDescription')).toBeDefined();
            expect(form.get('tags')).toBeDefined();
            expect(form.get('targetPlatforms')).toBeDefined();
            expect(form.get('media')).toBeDefined();
            expect(form.get('postAt')).toBeDefined();
            expect(form.get('selectedApiToken')).toBeDefined();
            expect(form.get('isPreview')).toBeDefined();
        });

        it('should update markdown text when body changes', () => {
            const testMarkdown = '# Test Heading';
            component.templateForm.patchValue({ body: testMarkdown });

            expect(component.markdownText).toBe(testMarkdown);
        });
    });

    describe('post method', () => {
        beforeEach(() => {
            fixture.detectChanges();
            component.selectedApiToken = mockAPIKey;
        });

        it('should create a post successfully', fakeAsync(() => {
            spyOn(window, 'alert');
            component.templateForm.patchValue({
                title: 'Test Title',
                body: 'Test body',
                tags: 'tag1, tag2',
                targetPlatforms: ['twitter'],
            });

            component.post();
            tick();

            expect(servicesService.createNewPost).toHaveBeenCalled();
            expect(component.isPosting).toBe(false);
            expect(window.alert).toHaveBeenCalledWith('Post created successfully! Post ID: post-123');
        }));

        it('should not post when form is invalid', () => {
            spyOn(console, 'error');
            component.templateForm.setErrors({ invalid: true });

            component.post();

            expect(console.error).toHaveBeenCalledWith('Form is invalid');
            expect(servicesService.createNewPost).not.toHaveBeenCalled();
        });

        it('should not post when no API token is selected', () => {
            spyOn(window, 'alert');
            spyOn(console, 'error');
            component.selectedApiToken = null;

            component.post();

            expect(console.error).toHaveBeenCalledWith('No API token selected');
            expect(window.alert).toHaveBeenCalledWith('Please select an API token before posting');
            expect(servicesService.createNewPost).not.toHaveBeenCalled();
        });

        it('should handle post creation errors', fakeAsync(() => {
            spyOn(window, 'alert');
            spyOn(console, 'error');
            const error = new Error('Post creation failed');
            servicesService.createNewPost.and.returnValue(throwError(() => error));

            component.post();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error creating post:', error);
            expect(window.alert).toHaveBeenCalledWith('Error creating post: Post creation failed');
            expect(component.isPosting).toBe(false);
        }));

        it('should parse tags correctly', fakeAsync(() => {
            component.templateForm.patchValue({
                title: 'Test',
                body: 'Test body',
                tags: 'tag1, tag2, tag3',
            });

            component.post();
            tick();

            const postRequestArg = servicesService.createNewPost.calls.mostRecent().args[0] as PostRequest;
            expect(postRequestArg.tags).toEqual(['tag1', 'tag2', 'tag3']);
        }));

        it('should set isPosting flag during post creation', () => {
            component.post();

            expect(component.isPosting).toBe(true);
        });
    });

    describe('platform selection', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should update selected platforms', () => {
            const platforms = ['twitter', 'facebook'];

            component.onPlatformSelectionChange(platforms);

            expect(component.selectedPlatforms).toEqual(platforms);
            expect(component.templateForm.get('targetPlatforms')?.value).toEqual(platforms);
        });
    });

    describe('API token management', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should update selected API token', () => {
            const newToken = mockAPIKeys[1];
            const mockEvent = {
                target: { value: newToken.id },
            } as any;

            component.onApiTokenSelectionChange(mockEvent);

            expect(component.selectedApiToken).toEqual(newToken);
            expect(component.templateForm.get('selectedApiToken')?.value).toEqual(newToken.id);
        });

        it('should generate new API token', fakeAsync(() => {
            spyOn(window, 'alert');
            const newToken = new APIKey('new-id', 'new-key', 'user-id');
            apiTokenService.generateToken.and.returnValue(of(newToken));

            component.generateNewApiToken();
            tick();

            expect(apiTokenService.generateToken).toHaveBeenCalled();
            expect(component.userApiTokens).toContain(newToken);
            expect(component.selectedApiToken).toEqual(newToken);
            expect(window.alert).toHaveBeenCalledWith('New API token generated successfully!');
        }));

        it('should handle token generation errors', fakeAsync(() => {
            spyOn(window, 'alert');
            spyOn(console, 'error');
            const error = new Error('Token generation failed');
            apiTokenService.generateToken.and.returnValue(throwError(() => error));

            component.generateNewApiToken();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error generating API token:', error);
            expect(window.alert).toHaveBeenCalledWith('Error generating API token');
        }));
    });

    describe('markdown parsing', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should parse markdown to HTML', () => {
            const markdown = '# Test Heading\n\nTest paragraph.';

            const result = component.parse(markdown);

            expect(result).toContain('<h1');
            expect(result).toContain('Test Heading');
        });

        it('should handle empty markdown', () => {
            const result = component.parse('');

            expect(result).toBeDefined();
        });
    });
});

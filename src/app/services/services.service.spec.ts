import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ServicesService } from './services.service';
import { PostRequest, PostResponse, APIKey } from './api-models';
import { environment } from 'src/environments/environment';

describe('ServicesService', () => {
    let service: ServicesService;
    let httpMock: HttpTestingController;

    const mockAPIKey: APIKey = {
        id: 'test-id-123',
        apiKey: 'test-api-key-456',
        userID: 'test-user-789',
    } as APIKey;

    const mockPostRequest: PostRequest = new PostRequest(
        mockAPIKey,
        ['twitter', 'facebook'],
        ['image1.jpg', 'image2.jpg'],
        'Test Post Title',
        'Test post description',
        '<p>Test post description</p>',
        ['tag1', 'tag2'],
        new Date('2025-08-30T12:00:00Z'),
    );

    const mockPostResponse: PostResponse = {
        postId: 'post-123',
        status: 1,
        mediaSavedUri: 'https://example.com/media/saved',
    } as PostResponse;

    const mockServices = [
        { serviceName: 'Twitter', id: '1', serviceID: 'twitter' },
        { serviceName: 'Facebook', id: '2', serviceID: 'facebook' },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ServicesService],
        });
        service = TestBed.inject(ServicesService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAvailableServices', () => {
        it('should fetch available services', () => {
            service.getAvailableServices().subscribe((services) => {
                expect(services).toEqual(mockServices);
                expect(services.length).toBe(2);
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Services_GetAvailable`);
            expect(req.request.method).toBe('GET');
            req.flush(mockServices);
        });

        it('should handle errors when fetching available services', () => {
            service.getAvailableServices().subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(401);
                },
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Services_GetAvailable`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('getAvailableService', () => {
        it('should fetch a specific available service', () => {
            const serviceName = 'twitter';
            const mockService = mockServices[0];

            service.getAvailableService(serviceName).subscribe((serviceData) => {
                expect(serviceData).toEqual(mockService);
            });

            const req = httpMock.expectOne(
                `${environment.endpoint}/Services_GetAvailableService?service=${serviceName}`,
            );
            expect(req.request.method).toBe('GET');
            req.flush(mockService);
        });
    });

    describe('getUserServices', () => {
        it('should fetch user services', () => {
            service.getUserServices().subscribe((services) => {
                expect(services).toEqual(mockServices);
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Services_GetUserServices`);
            expect(req.request.method).toBe('GET');
            req.flush(mockServices);
        });

        it('should return empty array when user has no services', () => {
            service.getUserServices().subscribe((services) => {
                expect(services).toEqual([]);
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Services_GetUserServices`);
            req.flush([]);
        });
    });

    describe('getUserService', () => {
        it('should fetch a specific user service', () => {
            const serviceName = 'twitter';
            const serviceId = 'user-service-123';
            const mockService = mockServices[0];

            service.getUserService(serviceName, serviceId).subscribe((serviceData) => {
                expect(serviceData).toEqual(mockService);
            });

            const expectedUrl = `${environment.endpoint}/Services_GetUserService?service=${serviceName}&serviceId=${serviceId}`;
            const req = httpMock.expectOne(expectedUrl);
            expect(req.request.method).toBe('GET');
            req.flush(mockService);
        });
    });

    describe('createNewPost', () => {
        it('should create a new post successfully', () => {
            service.createNewPost(mockPostRequest).subscribe((response) => {
                expect(response).toEqual(mockPostResponse);
                expect(response.postId).toBe('post-123');
                expect(response.status).toBe(1);
                expect(response.mediaSavedUri).toBe('https://example.com/media/saved');
            });

            const req = httpMock.expectOne(`${environment.postingEndpoint}/Post`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mockPostRequest);
            req.flush(mockPostResponse);
        });

        it('should handle validation errors when creating post', () => {
            service.createNewPost(mockPostRequest).subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(400);
                },
            });

            const req = httpMock.expectOne(`${environment.postingEndpoint}/Post`);
            req.flush('Bad Request - Invalid post data', { status: 400, statusText: 'Bad Request' });
        });

        it('should handle unauthorized errors when creating post', () => {
            service.createNewPost(mockPostRequest).subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(401);
                },
            });

            const req = httpMock.expectOne(`${environment.postingEndpoint}/Post`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });

        it('should send request with correct structure', () => {
            service.createNewPost(mockPostRequest).subscribe();

            const req = httpMock.expectOne(`${environment.postingEndpoint}/Post`);
            expect(req.request.body.apiKey).toEqual(mockAPIKey);
            expect(req.request.body.targetPlatforms).toEqual(['twitter', 'facebook']);
            expect(req.request.body.title).toBe('Test Post Title');
            expect(req.request.body.description).toBe('Test post description');
            expect(req.request.body.tags).toEqual(['tag1', 'tag2']);
            req.flush(mockPostResponse);
        });
    });
});

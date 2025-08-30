import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiTokenService } from './api-token.service';
import { APIKey } from './api-models';
import { environment } from 'src/environments/environment';

describe('ApiTokenService', () => {
    let service: ApiTokenService;
    let httpMock: HttpTestingController;

    const mockAPIKey: APIKey = {
        id: 'test-id-123',
        apiKey: 'test-api-key-456',
        userID: 'test-user-789',
    } as APIKey;

    const mockAPIKeys: APIKey[] = [
        mockAPIKey,
        {
            id: 'test-id-456',
            apiKey: 'test-api-key-789',
            userID: 'test-user-789',
        } as APIKey,
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ApiTokenService],
        });
        service = TestBed.inject(ApiTokenService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('generateToken', () => {
        it('should generate a new API token', () => {
            service.generateToken().subscribe((token) => {
                expect(token).toEqual(mockAPIKey);
                expect(token.id).toBe('test-id-123');
                expect(token.apiKey).toBe('test-api-key-456');
                expect(token.userID).toBe('test-user-789');
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_GenerateAPIToken`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(mockAPIKey);
        });

        it('should handle errors when generating token', () => {
            const errorMessage = 'Token generation failed';

            service.generateToken().subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(500);
                },
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_GenerateAPIToken`);
            req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('getAPITokens', () => {
        it('should fetch user API tokens', () => {
            service.getAPITokens().subscribe((tokens) => {
                expect(tokens).toEqual(mockAPIKeys);
                expect(tokens.length).toBe(2);
                expect(tokens[0].id).toBe('test-id-123');
                expect(tokens[1].id).toBe('test-id-456');
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_GetAPITokens`);
            expect(req.request.method).toBe('GET');
            req.flush(mockAPIKeys);
        });

        it('should return empty array when no tokens exist', () => {
            service.getAPITokens().subscribe((tokens) => {
                expect(tokens).toEqual([]);
                expect(tokens.length).toBe(0);
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_GetAPITokens`);
            req.flush([]);
        });

        it('should handle unauthorized error', () => {
            service.getAPITokens().subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(401);
                },
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_GetAPITokens`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('deleteAPIToken', () => {
        it('should delete an API token', () => {
            const deleteResponse = { success: true };

            service.deleteAPIToken(mockAPIKey).subscribe((response) => {
                expect(response).toEqual(deleteResponse);
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_DeleteAPIToken`);
            expect(req.request.method).toBe('DELETE');
            expect(req.request.body).toEqual(mockAPIKey);
            req.flush(deleteResponse);
        });

        it('should handle delete errors', () => {
            service.deleteAPIToken(mockAPIKey).subscribe({
                next: () => fail('Expected an error'),
                error: (error) => {
                    expect(error.status).toBe(404);
                },
            });

            const req = httpMock.expectOne(`${environment.endpoint}/Profile_DeleteAPIToken`);
            req.flush('Token not found', { status: 404, statusText: 'Not Found' });
        });
    });
});

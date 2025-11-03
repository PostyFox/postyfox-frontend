import { APIKey, PostRequest, PostResponse } from './api-models';

describe('API Models', () => {
    describe('APIKey', () => {
        it('should create an APIKey instance', () => {
            const apiKey = new APIKey('test-id', 'test-key', 'test-user-id');

            expect(apiKey).toBeTruthy();
            expect(apiKey.id).toBe('test-id');
            expect(apiKey.apiKey).toBe('test-key');
            expect(apiKey.userID).toBe('test-user-id');
        });

        it('should have all required properties', () => {
            const apiKey = new APIKey('id1', 'key1', 'user1');

            expect(apiKey.hasOwnProperty('id')).toBe(true);
            expect(apiKey.hasOwnProperty('apiKey')).toBe(true);
            expect(apiKey.hasOwnProperty('userID')).toBe(true);
        });
    });

    describe('PostRequest', () => {
        let apiKey: APIKey;
        let postDate: Date;

        beforeEach(() => {
            apiKey = new APIKey('test-id', 'test-key', 'test-user-id');
            postDate = new Date('2025-08-30T12:00:00Z');
        });

        it('should create a PostRequest instance', () => {
            const postRequest = new PostRequest(
                apiKey,
                ['twitter', 'facebook'],
                ['image1.jpg'],
                'Test Title',
                'Test description',
                '<p>Test HTML description</p>',
                ['tag1', 'tag2'],
                postDate,
            );

            expect(postRequest).toBeTruthy();
            expect(postRequest.apiKey).toEqual(apiKey);
            expect(postRequest.targetPlatforms).toEqual(['twitter', 'facebook']);
            expect(postRequest.media).toEqual(['image1.jpg']);
            expect(postRequest.title).toBe('Test Title');
            expect(postRequest.description).toBe('Test description');
            expect(postRequest.htmlDescription).toBe('<p>Test HTML description</p>');
            expect(postRequest.tags).toEqual(['tag1', 'tag2']);
            expect(postRequest.postAt).toEqual(postDate);
        });

        it('should handle empty arrays for optional fields', () => {
            const postRequest = new PostRequest(
                apiKey,
                [],
                [],
                'Title',
                'Description',
                'HTML Description',
                [],
                postDate,
            );

            expect(postRequest.targetPlatforms).toEqual([]);
            expect(postRequest.media).toEqual([]);
            expect(postRequest.tags).toEqual([]);
        });

        it('should have all required properties', () => {
            const postRequest = new PostRequest(
                apiKey,
                ['twitter'],
                ['image.jpg'],
                'Title',
                'Description',
                'HTML',
                ['tag'],
                postDate,
            );

            expect(postRequest.hasOwnProperty('apiKey')).toBe(true);
            expect(postRequest.hasOwnProperty('targetPlatforms')).toBe(true);
            expect(postRequest.hasOwnProperty('media')).toBe(true);
            expect(postRequest.hasOwnProperty('title')).toBe(true);
            expect(postRequest.hasOwnProperty('description')).toBe(true);
            expect(postRequest.hasOwnProperty('htmlDescription')).toBe(true);
            expect(postRequest.hasOwnProperty('tags')).toBe(true);
            expect(postRequest.hasOwnProperty('postAt')).toBe(true);
        });
    });

    describe('PostResponse', () => {
        it('should create a PostResponse instance', () => {
            const postResponse = new PostResponse('post-123', 1, 'https://example.com/media');

            expect(postResponse).toBeTruthy();
            expect(postResponse.postId).toBe('post-123');
            expect(postResponse.status).toBe(1);
            expect(postResponse.mediaSavedUri).toBe('https://example.com/media');
        });

        it('should handle different status codes', () => {
            const statusCodes = [0, 1, 2, 3, 4]; // Based on API spec enum

            statusCodes.forEach((status) => {
                const postResponse = new PostResponse(`post-${status}`, status, 'uri');
                expect(postResponse.status).toBe(status);
            });
        });

        it('should have all required properties', () => {
            const postResponse = new PostResponse('id', 0, 'uri');

            expect(postResponse.hasOwnProperty('postId')).toBe(true);
            expect(postResponse.hasOwnProperty('status')).toBe(true);
            expect(postResponse.hasOwnProperty('mediaSavedUri')).toBe(true);
        });
    });
});

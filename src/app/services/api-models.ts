export class APIKey {
    public id: string;
    public apiKey: string;
    public userID: string;

    constructor(id: string, apiKey: string, userID: string) {
        this.id = id;
        this.apiKey = apiKey;
        this.userID = userID;
    }
}

export class PostRequest {
    public apiKey: APIKey;
    public targetPlatforms: string[];
    public media: string[];
    public title: string;
    public description: string;
    public htmlDescription: string;
    public tags: string[];
    public postAt: Date;

    constructor(
        apiKey: APIKey,
        targetPlatforms: string[],
        media: string[],
        title: string,
        description: string,
        htmlDescription: string,
        tags: string[],
        postAt: Date,
    ) {
        this.apiKey = apiKey;
        this.targetPlatforms = targetPlatforms;
        this.media = media;
        this.title = title;
        this.description = description;
        this.htmlDescription = htmlDescription;
        this.tags = tags;
        this.postAt = postAt;
    }
}

export class PostResponse {
    public postId: string;
    public status: number; // 0-4 based on API spec
    public mediaSavedUri: string;

    constructor(postId: string, status: number, mediaSavedUri: string) {
        this.postId = postId;
        this.status = status;
        this.mediaSavedUri = mediaSavedUri;
    }
}

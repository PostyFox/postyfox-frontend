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

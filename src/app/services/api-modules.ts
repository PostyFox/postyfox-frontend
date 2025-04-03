export class PostRequest {
    public APIKey: string;
    public TargetPlatforms: string[];
    public Media: string[];
    public Title: string;
    public Description: string;
    public HTMLDescription: string;
    public Tags: string[];
    public PostAt: Date;

    constructor(
        APIKey: string,
        TargetPlatforms: string[],
        Media: string[],
        Title: string,
        Description: string,
        HTMLDescription: string,
        Tags: string[],
        PostAt: Date,
    ) {
        this.APIKey = APIKey;
        this.TargetPlatforms = TargetPlatforms;
        this.Media = Media;
        this.Title = Title;
        this.Description = Description;
        this.HTMLDescription = HTMLDescription;
        this.Tags = Tags;
        this.PostAt = PostAt;
    }
}

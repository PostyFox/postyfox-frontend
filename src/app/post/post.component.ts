import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EditorInstance, EditorOption } from 'angular-markdown-editor';
import { ServicesService } from '../services/services.service';
import { ApiTokenService } from '../services/api-token.service';
import { MarkdownService } from 'ngx-markdown';
import { PostRequest, APIKey, PostResponse } from '../services/api-models';

@Component({
    selector: 'app-post',
    templateUrl: './post.component.html',
    styleUrls: ['./post.component.scss'],
    standalone: false,
})
export class PostComponent implements OnInit {
    private fb = inject(FormBuilder);
    private servicesService = inject(ServicesService);
    private apiTokenService = inject(ApiTokenService);
    private markdownService = inject(MarkdownService);

    bsEditorInstance!: EditorInstance;
    markdownText = '';
    body = '';
    showEditor = true;
    templateForm!: FormGroup;
    editorOptions!: EditorOption;
    userServices: any[] = [];
    userApiTokens: APIKey[] = [];
    selectedApiToken: APIKey | null = null;
    selectedPlatforms: string[] = [];
    isPosting = false;

    ngOnInit(): void {
        // Initialize editor options first
        this.editorOptions = {
            autofocus: false,
            iconlibrary: 'fa',
            savable: false,
            onShow: (e) => (this.bsEditorInstance = e),
            parser: (val) => this.parse(val),
        };

        // Initialize markdown text
        this.markdownText = `### Markdown example
Post data here blah blah blah
`;

        // Build form first before loading data
        this.buildForm(this.markdownText);
        this.onFormChanges();

        // Load user services
        this.servicesService.getUserServices().subscribe(
            (response: any) => {
                this.userServices = response;
            },
            (error: any) => {
                console.error('Error fetching user services:', error);
            },
        );

        // Load user API tokens
        this.apiTokenService.getAPITokens().subscribe(
            (tokens: APIKey[]) => {
                this.userApiTokens = tokens;
                // Select the first token by default if available
                if (tokens.length > 0) {
                    this.selectedApiToken = tokens[0];
                    this.templateForm.patchValue({ selectedApiToken: tokens[0].id });
                }
            },
            (error: any) => {
                console.error('Error fetching API tokens:', error);
            },
        );
    }

    buildForm(markdownText: string) {
        this.templateForm = this.fb.group({
            title: [''],
            body: [markdownText],
            htmlDescription: [''],
            tags: [''],
            targetPlatforms: [[]],
            media: [[]],
            postAt: [new Date()],
            selectedApiToken: [null],
            isPreview: [true],
        });
    }

    /** highlight all code found, needs to be wrapped in timer to work properly */
    highlight() {
        setTimeout(() => {
            this.markdownService.highlight();
        });
    }

    hidePreview() {
        if (this.bsEditorInstance && this.bsEditorInstance.hidePreview) {
            this.bsEditorInstance.hidePreview();
        }
    }

    parse(inputValue: string) {
        const markedOutput = this.markdownService.parse(inputValue.trim());
        this.highlight();

        return markedOutput;
    }

    onFormChanges(): void {
        this.templateForm.valueChanges.subscribe((formData) => {
            if (formData) {
                this.markdownText = formData.body;
                // Update selected API token if changed via form
                if (formData.selectedApiToken && formData.selectedApiToken !== this.selectedApiToken?.id) {
                    // Find the actual token object from the ID
                    const selectedToken = this.userApiTokens.find((token) => token.id === formData.selectedApiToken);
                    this.selectedApiToken = selectedToken || null;
                }
            }
        });
    }

    onPlatformSelectionChange(platforms: string[]) {
        this.selectedPlatforms = platforms;
        this.templateForm.patchValue({ targetPlatforms: platforms });
    }

    onApiTokenSelectionChange(event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        const tokenId = selectElement.value;

        if (tokenId) {
            const selectedToken = this.userApiTokens.find((token) => token.id === tokenId);
            if (selectedToken) {
                this.selectedApiToken = selectedToken;
                this.templateForm.patchValue({ selectedApiToken: selectedToken.id });
            }
        } else {
            this.selectedApiToken = null;
            this.templateForm.patchValue({ selectedApiToken: null });
        }
    }

    trackByTokenId(index: number, token: APIKey): string {
        return token.id;
    }

    generateNewApiToken() {
        this.apiTokenService.generateToken().subscribe({
            next: (newToken: APIKey) => {
                console.log('New API token generated:', newToken);
                this.userApiTokens.push(newToken);
                this.selectedApiToken = newToken;
                this.templateForm.patchValue({ selectedApiToken: newToken.id });
                alert('New API token generated successfully!');
            },
            error: (error: any) => {
                console.error('Error generating API token:', error);
                alert('Error generating API token');
            },
        });
    }

    post() {
        if (this.templateForm.invalid) {
            console.error('Form is invalid');
            return;
        }

        // Check if an API token is selected
        const formSelectedToken = this.templateForm.value.selectedApiToken;
        let selectedToken = this.selectedApiToken;

        // If form has a token ID string, find the actual token object
        if (formSelectedToken && typeof formSelectedToken === 'string') {
            selectedToken = this.userApiTokens.find((token) => token.id === formSelectedToken) || null;
        } else if (formSelectedToken && typeof formSelectedToken === 'object') {
            selectedToken = formSelectedToken;
        }

        if (!selectedToken) {
            console.error('No API token selected');
            alert('Please select an API token before posting');
            return;
        }

        this.isPosting = true;
        const formData = this.templateForm.value;

        // Parse tags from comma-separated string to array
        const tags = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()) : [];

        // Create PostRequest object using the selected API token
        const postRequest = new PostRequest(
            selectedToken, // Use the actual selected API token
            formData.targetPlatforms || this.selectedPlatforms,
            formData.media || [],
            formData.title,
            formData.body, // Using markdown body as description
            formData.htmlDescription || this.parse(formData.body), // Convert markdown to HTML
            tags,
            new Date(formData.postAt),
        );

        console.log('Posting data:', postRequest);

        // Send to service
        this.servicesService.createNewPost(postRequest).subscribe({
            next: (response: PostResponse) => {
                console.log('Post created successfully:', response);
                console.log('Post ID:', response.postId);
                console.log('Status:', response.status);
                this.isPosting = false;
                // Handle success - maybe show a success message or redirect
                alert(`Post created successfully! Post ID: ${response.postId}`);
            },
            error: (error: any) => {
                console.error('Error creating post:', error);
                this.isPosting = false;
                // Handle error - show error message to user
                alert(`Error creating post: ${error.message || 'Unknown error'}`);
            },
        });
    }
}

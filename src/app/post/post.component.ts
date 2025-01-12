import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EditorInstance, EditorOption } from 'angular-markdown-editor';
import { ServicesService } from '../services/services.service';
import { MarkdownService } from 'ngx-markdown';

@Component({
    selector: 'app-post',
    templateUrl: './post.component.html',
    styleUrls: ['./post.component.scss'],
    standalone: false,
})
export class PostComponent implements OnInit {
    bsEditorInstance!: EditorInstance;
    markdownText = '';
    showEditor = true;
    templateForm!: FormGroup;
    editorOptions!: EditorOption;
    userServices: any[] = [];

    constructor(
        private fb: FormBuilder,
        private servicesService: ServicesService,
        private markdownService: MarkdownService,
    ) {}

    ngOnInit(): void {
        this.servicesService.getUserServices().subscribe(
            (response: any) => {
                this.userServices = response;
            },
            (error: any) => {
                console.error('Error fetching user services:', error);
            },
        );

        this.editorOptions = {
            autofocus: false,
            iconlibrary: 'fa',
            savable: false,
            onShow: (e) => (this.bsEditorInstance = e),
            parser: (val) => this.parse(val),
        };

        // parser: (val) => this.parse(val)
        // put the text completely on the left to avoid extra white spaces
        this.markdownText = `### Markdown example
Post data here blah blah blah
`;

        this.buildForm(this.markdownText);
        this.onFormChanges();
    }

    buildForm(markdownText: string) {
        this.templateForm = this.fb.group({
            body: [markdownText],
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
            }
        });
    }
}

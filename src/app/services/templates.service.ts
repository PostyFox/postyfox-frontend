import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class TemplatesService {
    private http = inject(HttpClient);

    private templatesGetTemplatesUrl = `${environment.endpoint}/PostingTemplates_GetTemplates`;

    getUserPostingTemplates(): Observable<any> {
        return this.http.get(this.templatesGetTemplatesUrl);
    }

    // Add other CRUD methods if needed
}

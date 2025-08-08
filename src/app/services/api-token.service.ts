import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ApiTokenService {
    private http = inject(HttpClient);

    private apiUrl = `${environment.endpoint}/Profile_GenerateAPIToken`;

    generateToken(): Observable<any> {
        return this.http.post(this.apiUrl, {});
    }

    // Add other CRUD methods if needed
}

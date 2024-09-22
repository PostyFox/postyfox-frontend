import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ApiTokenService {
    private apiUrl = 'https://postyfox-func-app-dotnet-dev.azurewebsites.net/api/Profile_GenerateAPIToken';

    constructor(private http: HttpClient) {}

    generateToken(): Observable<any> {
        return this.http.post(this.apiUrl, {});
    }

    // Add other CRUD methods if needed
}

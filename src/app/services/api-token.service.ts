import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { APIKey } from './api-models';

@Injectable({
    providedIn: 'root',
})
export class ApiTokenService {
    private http = inject(HttpClient);

    private generateTokenUrl = `${environment.endpoint}/Profile_GenerateAPIToken`;
    private getTokensUrl = `${environment.endpoint}/Profile_GetAPITokens`;
    private deleteTokenUrl = `${environment.endpoint}/Profile_DeleteAPIToken`;

    generateToken(): Observable<APIKey> {
        return this.http.get<APIKey>(this.generateTokenUrl, {});
    }

    getAPITokens(): Observable<APIKey[]> {
        return this.http.get<APIKey[]>(this.getTokensUrl);
    }

    deleteAPIToken(apiKey: APIKey): Observable<any> {
        return this.http.delete(this.deleteTokenUrl, { body: apiKey });
    }
}

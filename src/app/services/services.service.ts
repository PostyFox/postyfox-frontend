import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ServicesService {
    private servicesUrl = `${environment.endpoint}/Services_GetAvailable`;
    private userServicesUrl = `${environment.endpoint}/Services_GetUserService`;

    constructor(private http: HttpClient) {}

    getAvailableServices(): Observable<any> {
        return this.http.get(this.servicesUrl);
    }

    getUserServices(): Observable<any> {
        return this.http.get(this.userServicesUrl);
    }

    // Add other CRUD methods if needed
}

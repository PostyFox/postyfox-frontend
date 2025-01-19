import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ServicesService {
    private servicesUrl = `${environment.endpoint}/Services_GetAvailable`;
    private serviceUrl = `${environment.endpoint}/Services_GetAvailableService`;
    private userServicesUrl = `${environment.endpoint}/Services_GetUserService`;

    constructor(private http: HttpClient) {}

    getAvailableServices(): Observable<any> {
        return this.http.get(this.servicesUrl);
    }

    getAvailableService(serviceName: string): Observable<any> {
        return this.http.get(this.serviceUrl, { params: { serviceName } });
    }

    getUserServices(): Observable<any> {
        return this.http.get(this.userServicesUrl);
    }

    // Add other CRUD methods if needed
}

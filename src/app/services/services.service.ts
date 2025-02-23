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
    private userServicesUrl = `${environment.endpoint}/Services_GetUserServices`;
    private userServiceUrl = `${environment.endpoint}/Services_GetUserService`;

    constructor(private http: HttpClient) {}

    getAvailableServices(): Observable<any> {
        return this.http.get(this.servicesUrl);
    }

    getAvailableService(service: string): Observable<any> {
        return this.http.get(this.serviceUrl, { params: { service } });
    }

    getUserServices(): Observable<any> {
        return this.http.get(this.userServicesUrl);
    }

    getUserService(service: string, serviceId: string): Observable<any> {
        return this.http.get(this.userServiceUrl, { params: { service, serviceId } });
    }

    // Add other CRUD methods if needed
}

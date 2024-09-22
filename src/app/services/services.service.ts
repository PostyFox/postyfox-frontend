import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ServicesService {
    private servicesUrl = '${environment.endpoint}/Services_GetAvailable';

    constructor(private http: HttpClient) {}

    getAvailableServices(): Observable<any> {
        return this.http.get(this.servicesUrl);
    }

    // Add other CRUD methods if needed
}

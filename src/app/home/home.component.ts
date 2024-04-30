import { Component, OnInit } from '@angular/core';
import { filter } from 'rxjs/operators';

import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { createClaimsTable } from '../claim-utils';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
    loginDisplay = false;
    displayedColumns: string[] = ['claim', 'value', 'description'];
    dataSource: any = [];
    claimName: string = '';

    constructor(
        private authService: MsalService,
        private msalBroadcastService: MsalBroadcastService,
        private http: HttpClient,
    ) {}

    ngOnInit(): void {
        this.msalBroadcastService.msalSubject$
            .pipe(filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS))
            .subscribe((result: EventMessage) => {
                const payload = result.payload as AuthenticationResult;
                this.authService.instance.setActiveAccount(payload.account);
            });

        this.msalBroadcastService.inProgress$
            .pipe(filter((status: InteractionStatus) => status === InteractionStatus.None))
            .subscribe(() => {
                this.setLoginDisplay();
                this.getClaims(this.authService.instance.getActiveAccount()?.idTokenClaims);
                this.getUser(); // Attempt to fetch the user data from PostyFox api
            });
    }

    setLoginDisplay() {
        this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    }

    getUser() {
        this.http.get(`${environment.endpoint}/Services_GetUserService`).subscribe((result) => {
            console.log({ result });
        });
    }

    getClaims(claims: any) {
        console.log({ claims });
        if (claims) {
            const name_parts: string[] = [];
            if ('given_name' in claims) {
                name_parts.push(claims.given_name);
            }
            if ('family_name' in claims) {
                name_parts.push(claims.family_name);
            }
            this.claimName = name_parts.join(' ');
        }
    }
}

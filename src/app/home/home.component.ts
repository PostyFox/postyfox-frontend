import { Component, OnInit } from '@angular/core';
import { filter } from 'rxjs/operators';

import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { createClaimsTable } from '../claim-utils';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

    loginDisplay = false;
    displayedColumns: string[] = ['claim', 'value', 'description'];
    dataSource: any = [];
    claimName: string = "";

    constructor(private authService: MsalService, private msalBroadcastService: MsalBroadcastService) { }

    ngOnInit(): void {
        this.msalBroadcastService.msalSubject$
            .pipe(
                filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
            )
            .subscribe((result: EventMessage) => {
                const payload = result.payload as AuthenticationResult;
                this.authService.instance.setActiveAccount(payload.account);
            });

        this.msalBroadcastService.inProgress$
            .pipe(
                filter((status: InteractionStatus) => status === InteractionStatus.None)
            )
            .subscribe(() => {
                this.setLoginDisplay();
                this.getClaims(this.authService.instance.getActiveAccount()?.idTokenClaims);
            })
    }

    setLoginDisplay() {
        this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    }

    getClaims(claims: any) {
        if (claims) {
          Object.keys(claims).map((key) => {
            switch (key) {
              case 'name':
                this.claimName = claims[key];
                break;
          }
            // const claimsTable = createClaimsTable(claims);
            // this.dataSource = [...claimsTable];
        });
      }
    }
}

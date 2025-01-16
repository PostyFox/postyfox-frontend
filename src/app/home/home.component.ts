import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { ApiTokenService } from '../services/api-token.service';
import { ServicesService } from '../services/services.service';
import { TemplatesService } from '../services/templates.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { UserservicedialogComponent } from '../userservicedialog/userservicedialog.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false,
})
export class HomeComponent implements OnInit {
    loginDisplay = false;
    displayedColumns: string[] = ['claim', 'value', 'description'];
    dataSource: any = [];
    claimName: string = '';
    services: any[] = [];
    userServices: any[] = [];
    userTemplates: any[] = [];

    constructor(
        private authService: MsalService,
        private msalBroadcastService: MsalBroadcastService,
        private apiTokenService: ApiTokenService,
        private servicesService: ServicesService,
        private templatesService: TemplatesService,
        private router: Router,
        private dialog: MatDialog,
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
        // this.http.get(`${environment.endpoint}/Services_GetUserService`).subscribe((result) => {
        //     console.log({ result });
        // });

        this.loadAvailableServices();
        this.loadPostingTemplates();
    }

    getClaims(claims: any) {
        console.log({ claims });
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
        const name_parts: string[] = [];
        if ('given_name' in claims) {
            name_parts.push(claims.given_name);
        }
        if ('family_name' in claims) {
            name_parts.push(claims.family_name);
        }
        this.claimName = name_parts.join(' ');
    }

    generateApiToken() {
        this.apiTokenService.generateToken().subscribe(
            (response: any) => {
                console.log('API Token generated:', response);
            },
            (error: any) => {
                console.error('Error generating API Token:', error);
            },
        );
    }

    loadAvailableServices() {
        this.servicesService.getAvailableServices().subscribe(
            (response: any) => {
                this.services = response;
            },
            (error: any) => {
                console.error('Error fetching services:', error);
            },
        );

        this.servicesService.getUserServices().subscribe(
            (response: any) => {
                this.userServices = response;
            },
            (error: any) => {
                console.error('Error fetching user services:', error);
            },
        );
    }

    loadPostingTemplates() {
        this.templatesService.getUserPostingTemplates().subscribe(
            (response: any) => {
                this.userTemplates = response;
            },
            (error: any) => {
                console.error('Error fetching users templates:', error);
            },
        );
    }

    editExistingUserService(serviceId: string) {
        // Pop modal with the service form
        // Buid the form with the service config definition
        // Bind any existing user service data to the form
        const dialogConfig = new MatDialogConfig();

        dialogConfig.disableClose = true;
        dialogConfig.autoFocus = true;
        dialogConfig.width = '60%';
        dialogConfig.data = {
            serviceName: 'Testing',
            serviceId: serviceId,
        };

        let dialogref = this.dialog.open(UserservicedialogComponent, dialogConfig);
    }

    btnCreateQuickPost() {
        this.router.navigateByUrl('/post');
    }
}

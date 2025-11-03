import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import '@cds/core/icon/register.js';
import { ClarityIcons, cloudScaleIcon, bellIcon, userIcon, loginIcon, logoutIcon } from '@cds/core/icon';

import { RouterLinkActive } from '@angular/router';

import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import {
    AuthenticationResult,
    InteractionStatus,
    PopupRequest,
    RedirectRequest,
    EventMessage,
    EventType,
    InteractionType,
    AccountInfo,
} from '@azure/msal-browser';
import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
    private msalGuardConfig = inject<MsalGuardConfiguration>(MSAL_GUARD_CONFIG);
    private authService = inject(MsalService);
    private msalBroadcastService = inject(MsalBroadcastService);

    title = 'PostyFox';
    isIframe = false;
    loginDisplay = false;
    private readonly _destroying$ = new Subject<void>();

    constructor() {
        ClarityIcons.addIcons(cloudScaleIcon);
        ClarityIcons.addIcons(bellIcon);
        ClarityIcons.addIcons(userIcon);
        ClarityIcons.addIcons(loginIcon);
        ClarityIcons.addIcons(logoutIcon);
    }

    ngOnInit(): void {
        this.isIframe = window !== window.parent && !window.opener;
        this.setLoginDisplay();

        this.authService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window

        /**
         * You can subscribe to MSAL events as shown below. For more info,
         * visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v2-docs/events.md
         */
        this.msalBroadcastService.msalSubject$
            .pipe(
                filter(
                    (msg: EventMessage) =>
                        msg.eventType === EventType.ACCOUNT_ADDED || msg.eventType === EventType.ACCOUNT_REMOVED,
                ),
            )
            .subscribe((result: EventMessage) => {
                if (this.authService.instance.getAllAccounts().length === 0) {
                    window.location.pathname = '/';
                } else {
                    this.setLoginDisplay();
                }
            });

        this.msalBroadcastService.inProgress$
            .pipe(
                filter((status: InteractionStatus) => status === InteractionStatus.None),
                takeUntil(this._destroying$),
            )
            .subscribe(() => {
                this.setLoginDisplay();
                this.checkAndSetActiveAccount();
            });

        this.msalBroadcastService.msalSubject$
            .pipe(
                filter(
                    (msg: EventMessage) =>
                        msg.eventType === EventType.LOGIN_SUCCESS ||
                        msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
                        msg.eventType === EventType.SSO_SILENT_SUCCESS,
                ),
                takeUntil(this._destroying$),
            )
            .subscribe((result: EventMessage) => {
                const payload = result.payload as AuthenticationResult;
                this.authService.instance.setActiveAccount(payload.account);
                return result;
            });

        // No B2C logic required for Entra tenant
    }

    setLoginDisplay() {
        this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    }

    checkAndSetActiveAccount() {
        /**
         * If no active account set but there are accounts signed in, sets first account to active account
         * To use active account set here, subscribe to inProgress$ first in your component
         * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
         */
        let activeAccount = this.authService.instance.getActiveAccount();

        if (!activeAccount && this.authService.instance.getAllAccounts().length > 0) {
            let accounts = this.authService.instance.getAllAccounts();
            // add your code for handling multiple accounts here
            this.authService.instance.setActiveAccount(accounts[0]);
        }
    }

    login(userFlowRequest?: RedirectRequest | PopupRequest) {
        if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
            if (this.msalGuardConfig.authRequest) {
                this.authService
                    .loginPopup({ ...this.msalGuardConfig.authRequest, ...userFlowRequest } as PopupRequest)
                    .subscribe((response: AuthenticationResult) => {
                        this.authService.instance.setActiveAccount(response.account);
                    });
            } else {
                this.authService.loginPopup(userFlowRequest).subscribe((response: AuthenticationResult) => {
                    this.authService.instance.setActiveAccount(response.account);
                });
            }
        } else {
            if (this.msalGuardConfig.authRequest) {
                this.authService.loginRedirect({
                    ...this.msalGuardConfig.authRequest,
                    ...userFlowRequest,
                } as RedirectRequest);
            } else {
                this.authService.loginRedirect(userFlowRequest);
            }
        }
    }

    logout() {
        const activeAccount =
            this.authService.instance.getActiveAccount() || this.authService.instance.getAllAccounts()[0];

        if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
            this.authService.logoutPopup({
                account: activeAccount,
            });
        } else {
            this.authService.logoutRedirect({
                account: activeAccount,
            });
        }
    }

    // unsubscribe to events when component is destroyed
    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }
}

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import '@cds/core/icon/register.js';
import { ClarityIcons, cloudScaleIcon, bellIcon, userIcon, loginIcon, logoutIcon } from '@cds/core/icon';

import { RouterLinkActive } from '@angular/router';

import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { authConfig } from './auth-config';
import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
    private oauthService = inject(OAuthService);

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

        // Configure OAuth service with auth config
        this.oauthService.configure(authConfig);

        // Load discovery document and try silent login
        this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
            if (this.oauthService.hasValidAccessToken()) {
                this.setLoginDisplay();
            }
        });
    }

    ngOnInit(): void {
        this.isIframe = window !== window.parent && !window.opener;
        this.setLoginDisplay();

        // Subscribe to OAuth events
        this.oauthService.events
            .pipe(
                filter(
                    (e: OAuthEvent) =>
                        e.type === 'token_received' || e.type === 'token_refreshed' || e.type === 'logout',
                ),
                takeUntil(this._destroying$),
            )
            .subscribe((event: OAuthEvent) => {
                this.setLoginDisplay();

                // Handle redirect after login
                if (event.type === 'token_received') {
                    const redirectUrl = sessionStorage.getItem('redirectUrl');
                    if (redirectUrl) {
                        sessionStorage.removeItem('redirectUrl');
                        window.location.href = redirectUrl;
                    }
                }
            });
    }

    setLoginDisplay() {
        this.loginDisplay = this.oauthService.hasValidAccessToken();
    }

    login() {
        this.oauthService.initCodeFlow();
    }

    logout() {
        this.oauthService.logOut();
    }

    // unsubscribe to events when component is destroyed
    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }
}

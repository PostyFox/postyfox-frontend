import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable({
    providedIn: 'root',
})
export class OAuthGuard implements CanActivate {
    private oauthService = inject(OAuthService);
    private router = inject(Router);

    canActivate(): boolean {
        if (this.oauthService.hasValidAccessToken()) {
            return true;
        } else {
            // Redirect to login
            this.oauthService.initCodeFlow();
            return false;
        }
    }
}

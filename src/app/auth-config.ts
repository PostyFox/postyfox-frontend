import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../environments/environment';

export const authConfig: AuthConfig = {
    issuer: environment.oidcConfig.issuer,
    clientId: environment.oidcConfig.clientId,
    redirectUri: window.location.origin + (environment.oidcConfig.redirectUri || '/'),
    postLogoutRedirectUri: window.location.origin + (environment.oidcConfig.postLogoutRedirectUri || '/'),
    scope: environment.oidcConfig.scope || 'openid profile email',
    responseType: 'code',
    requireHttps: environment.production,
    showDebugInformation: !environment.production,
    sessionChecksEnabled: true,
    clearHashAfterLogin: true,
};

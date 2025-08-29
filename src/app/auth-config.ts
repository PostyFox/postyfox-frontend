import { Configuration } from '@azure/msal-browser';
import { environment } from '../environments/environment';

export const msalConfig: Configuration = {
    auth: {
        clientId: environment.msalConfig.auth.clientId,
        authority: environment.b2cPolicies.authorities.signUpSignIn.authority,
        redirectUri: '/',
        postLogoutRedirectUri: '/',
        knownAuthorities: [environment.b2cPolicies.authorityDomain],
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
    },
};

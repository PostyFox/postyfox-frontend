// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// This file is for the settings LOCAL development

export const environment = {
    production: true,
    endpoint: 'https://dev.api.postyfox.com/api',
    postingEndpoint: 'https://dev.post.postyfox.com/api',
    msalConfig: {
        auth: {
            clientId: '<entra-app-client-id>',
            authority: 'https://login.microsoftonline.com/<entra-tenant-id-or-domain>/',
            redirectUri: '<your-app-redirect-uri>',
            postLogoutRedirectUri: '<your-app-post-logout-uri>',
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false,
        },
    },
    apiConfig: {
        scopes: ['openid', 'profile', 'email', '<your-api-scope>'],
        uri: '<your-api-uri>',
    },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

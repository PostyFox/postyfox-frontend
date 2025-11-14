// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// This file is for the settings LOCAL development

export const environment = {
    production: true,
    endpoint: 'https://dev.api.postyfox.com/api',
    postingEndpoint: 'https://dev.post.postyfox.com/api',
    oidcConfig: {
        issuer: 'https://keycloak.furryfandom.me/realms/PostyFox',
        clientId: '9b930c86-ea5b-40d0-a200-36a152032910',
        redirectUri: '/',
        postLogoutRedirectUri: '/',
        scope: 'profile email',
    },
    apiConfig: {
        scopes: ['profile'],
        uri: 'https://dev.api.postyfox.com/api',
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

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// This file is for the settings LOCAL development

export const environment = {
    production: false,
    endpoint: 'https://dev.api.postyfox.com/api',
    postingEndpoint: 'https://dev.post.postyfox.com/api',
    msalConfig: {
        auth: {
            clientId: '2b89259d-3cc3-41fe-adbf-5f9acb15e622',
        },
    },
    apiConfig: {
        scopes: ['profile', 'https://postyfoxdev.onmicrosoft.com/2b89259d-3cc3-41fe-adbf-5f9acb15e622/Postyfox.Use'],
        uri: '/api/',
    },
    b2cPolicies: {
        names: {
            signUpSignIn: 'B2C_1_Signin',
            resetPassword: 'B2C_1_reset_v3',
            editProfile: 'B2C_1_edit_profile_v2',
        },
        authorities: {
            signUpSignIn: {
                authority: 'https://postyfoxdev.b2clogin.com/postyfoxdev.onmicrosoft.com/B2C_1_Signin',
            },
            resetPassword: {
                authority: 'https://postyfoxdev.b2clogin.com/postyfoxdev.onmicrosoft.com/B2C_1_reset_v3',
            },
            editProfile: {
                authority: 'https://postyfoxdev.b2clogin.com/postyfoxdev.onmicrosoft.com/b2c_1_edit_profile_v2',
            },
        },
        authorityDomain: 'postyfoxdev.b2clogin.com',
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

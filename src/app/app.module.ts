import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
    IPublicClientApplication,
    PublicClientApplication,
    InteractionType,
    BrowserCacheLocation,
    LogLevel,
} from '@azure/msal-browser';
import {
    MsalGuard,
    MsalInterceptor,
    MsalBroadcastService,
    MsalInterceptorConfiguration,
    MsalModule,
    MsalService,
    MSAL_GUARD_CONFIG,
    MSAL_INSTANCE,
    MSAL_INTERCEPTOR_CONFIG,
    MsalGuardConfiguration,
    MsalRedirectComponent,
} from '@azure/msal-angular';

import { PostComponent } from './post/post.component';

import { AngularMarkdownEditorModule } from 'angular-markdown-editor';
import { environment } from 'src/environments/environment';

export function loggerCallback(logLevel: LogLevel, message: string) {
    console.log(message);
}

export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: environment.msalConfig.auth.clientId,
            authority: environment.b2cPolicies.authorities.signUpSignIn.authority,
            redirectUri: '/',
            postLogoutRedirectUri: '/',
            knownAuthorities: [environment.b2cPolicies.authorityDomain],
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage,
        },
        system: {
            allowNativeBroker: false, // Disables WAM Broker
            loggerOptions: {
                loggerCallback,
                logLevel: LogLevel.Verbose,
                piiLoggingEnabled: false,
            },
        },
    });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();

    protectedResourceMap.set(environment.apiConfig.uri, environment.apiConfig.scopes);

    return {
        interactionType: InteractionType.Redirect,
        protectedResourceMap,
    };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: [...environment.apiConfig.scopes],
        },
        loginFailedRoute: '/login-failed',
    };
}

@NgModule({
    declarations: [AppComponent, HomeComponent, PostComponent],
    bootstrap: [AppComponent, MsalRedirectComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        MatButtonModule,
        MatToolbarModule,
        MatListModule,
        MatTableModule,
        MatCardModule,
        MatInputModule,
        MatFormFieldModule,
        MatCheckboxModule,
        MatIconModule,
        MatSelectModule,
        FormsModule,
        ReactiveFormsModule,
        MsalModule,
        // .forRoot(
        //     new PublicClientApplication(msalConfig),
        //     {
        //         interactionType: InteractionType.Redirect,
        //         authRequest: loginRequest,
        //     },
        //     {
        //         interactionType: InteractionType.Redirect,
        //         protectedResourceMap: new Map<string, Array<string | ProtectedResourceScopes> | null>(
        //             Object.entries(protectedResources),
        //         ),
        //     },
        // ),
        AngularMarkdownEditorModule.forRoot({
            // add any Global Options/Config you might want
            // to avoid passing the same options over and over in each components of your App
            iconlibrary: 'fa',
        }),
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true,
        },
        {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory,
        },
        {
            provide: MSAL_GUARD_CONFIG,
            useFactory: MSALGuardConfigFactory,
        },
        {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory,
        },
        MsalGuard,
        MsalService,
        MsalBroadcastService,
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModule {}

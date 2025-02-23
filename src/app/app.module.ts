import { BrowserModule } from '@angular/platform-browser';
import { MarkdownModule, MarkedOptions } from 'ngx-markdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ClarityModule } from '@clr/angular';

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
import { UserservicedialogComponent } from './userservicedialog/userservicedialog.component';
import { FormQuestionComponent } from './form-question/form-question.component';
import { FormService } from './services/form.service';

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
                logLevel: LogLevel.Info,
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
    declarations: [AppComponent, HomeComponent, PostComponent, UserservicedialogComponent],
    bootstrap: [AppComponent, MsalRedirectComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        ClarityModule,
        AppRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        MsalModule,
        MarkdownModule.forRoot(),
        AngularMarkdownEditorModule.forRoot({
            // add any Global Options/Config you might want
            // to avoid passing the same options over and over in each components of your App
            iconlibrary: 'fa',
        }),
        FormQuestionComponent,
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
        FormService,
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModule {}

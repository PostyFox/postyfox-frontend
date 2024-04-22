import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { PublicClientApplication, InteractionType } from '@azure/msal-browser';
import {
    MsalGuard,
    MsalInterceptor,
    MsalModule,
    MsalRedirectComponent,
    ProtectedResourceScopes,
} from '@azure/msal-angular';

import { msalConfig, loginRequest, protectedResources } from './auth-config';

// https://learn.microsoft.com/en-gb/entra/identity-platform/tutorial-v2-angular-auth-code

@NgModule({
    declarations: [AppComponent, HomeComponent],
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
        HttpClientModule,
        FormsModule,
        MsalModule.forRoot(
            new PublicClientApplication(msalConfig),
            {
                interactionType: InteractionType.Redirect,
                authRequest: loginRequest,
            },
            {
                interactionType: InteractionType.Redirect,
                protectedResourceMap: new Map<string, Array<string | ProtectedResourceScopes> | null>(
                    Object.entries(protectedResources),
                ),
            },
        ),
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true,
        },
        MsalGuard,
    ],
    bootstrap: [AppComponent, MsalRedirectComponent],
})
export class AppModule {}

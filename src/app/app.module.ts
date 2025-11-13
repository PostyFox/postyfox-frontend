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
import { OAuthModule, OAuthStorage } from 'angular-oauth2-oidc';

import { PostComponent } from './post/post.component';

import { AngularMarkdownEditorModule } from 'angular-markdown-editor';
import { environment } from 'src/environments/environment';
import { UserservicedialogComponent } from './userservicedialog/userservicedialog.component';
import { FormQuestionComponent } from './form-question/form-question.component';
import { FormService } from './services/form.service';

@NgModule({
    declarations: [AppComponent, HomeComponent, PostComponent, UserservicedialogComponent],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        ClarityModule,
        AppRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        OAuthModule.forRoot({
            resourceServer: {
                allowedUrls: [environment.endpoint, environment.postingEndpoint],
                sendAccessToken: true,
            },
        }),
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
            provide: OAuthStorage,
            useValue: localStorage,
        },
        FormService,
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class AppModule {}

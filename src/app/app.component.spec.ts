import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
    MSAL_GUARD_CONFIG,
    MSAL_INSTANCE,
    MsalGuardConfiguration,
    MsalService,
    MsalBroadcastService,
} from '@azure/msal-angular';
import { InteractionType, IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { AppComponent } from './app.component';

function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: 'test-client-id',
            authority: 'https://test.b2clogin.com/test.onmicrosoft.com/B2C_1_test',
            redirectUri: '/',
        },
        cache: {
            cacheLocation: 'localStorage',
        },
    });
}

function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: ['openid', 'profile'],
        },
    };
}

describe('AppComponent', () => {
    beforeEach(() =>
        TestBed.configureTestingModule({
            declarations: [AppComponent],
            imports: [RouterTestingModule],
            providers: [
                {
                    provide: MSAL_INSTANCE,
                    useFactory: MSALInstanceFactory,
                },
                {
                    provide: MSAL_GUARD_CONFIG,
                    useFactory: MSALGuardConfigFactory,
                },
                MsalService,
                MsalBroadcastService,
            ],
        }),
    );

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it(`should have as title 'PostyFox'`, () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app.title).toEqual('PostyFox');
    });

    it('should render title', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.title')?.textContent).toContain('PostyFox');
    });
});

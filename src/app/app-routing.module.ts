import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MsalGuard, MsalRedirectComponent } from '@azure/msal-angular';
import { BrowserUtils } from '@azure/msal-browser';

import { HomeComponent } from './home/home.component';
import { PostComponent } from './post/post.component';

// const routes: Routes = [
//     {
//         // Needed for handling redirect after login
//         path: 'auth',
//         component: MsalRedirectComponent,
//     },
//     {
//         path: '',
//         component: HomeComponent,
//     },
//     {
//         path: 'post',
//         component: PostComponent,
//     },
// ];

const routes: Routes = [
    {
        path: 'post',
        component: PostComponent,
        canActivate: [MsalGuard],
    },
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'login-failed',
        component: HomeComponent,
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            // Don't perform initial navigation in iframes or popups
            initialNavigation:
                !BrowserUtils.isInIframe() && !BrowserUtils.isInPopup() ? 'enabledNonBlocking' : 'disabled', // Set to enabledBlocking to use Angular Universal
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}

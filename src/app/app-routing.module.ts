import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OAuthGuard } from './guards/oauth.guard';

import { HomeComponent } from './home/home.component';
import { PostComponent } from './post/post.component';

const routes: Routes = [
    {
        path: 'post',
        title: 'Create a new post',
        component: PostComponent,
        canActivate: [OAuthGuard],
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
            // Standard navigation configuration
            initialNavigation: 'enabledBlocking',
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}

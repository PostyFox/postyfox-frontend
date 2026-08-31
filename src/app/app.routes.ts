import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    // Kept outside the guarded layout so it's reachable without an authenticated session.
    path: 'privacy',
    title: 'Privacy Policy · PostyFox',
    loadComponent: () =>
      import('./features/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · PostyFox',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'connectors',
        title: 'Connectors · PostyFox',
        loadComponent: () =>
          import('./features/connectors/connectors.component').then((m) => m.ConnectorsComponent),
      },
      {
        path: 'templates',
        title: 'Templates · PostyFox',
        loadComponent: () =>
          import('./features/templates/templates.component').then((m) => m.TemplatesComponent),
      },
      {
        path: 'tag-presets',
        title: 'Tag presets · PostyFox',
        loadComponent: () =>
          import('./features/tag-presets/tag-presets.component').then((m) => m.TagPresetsComponent),
      },
      {
        path: 'text-templates',
        title: 'Text templates · PostyFox',
        loadComponent: () =>
          import('./features/text-templates/text-templates.component').then(
            (m) => m.TextTemplatesComponent,
          ),
      },
      {
        path: 'compose',
        title: 'Compose · PostyFox',
        loadComponent: () =>
          import('./features/compose/compose.component').then((m) => m.ComposeComponent),
      },
      {
        path: 'posts',
        pathMatch: 'full',
        title: 'Posts · PostyFox',
        loadComponent: () =>
          import('./features/posts/posts.component').then((m) => m.PostsComponent),
      },
      {
        path: 'posts/:id',
        title: 'Post status · PostyFox',
        loadComponent: () =>
          import('./features/post-status/post-status.component').then((m) => m.PostStatusComponent),
      },
      {
        path: 'triggers',
        title: 'Triggers · PostyFox',
        loadComponent: () =>
          import('./features/triggers/triggers.component').then((m) => m.TriggersComponent),
      },
      {
        path: 'admin',
        title: 'Administration · PostyFox',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        // NB: kept off the `/api` prefix so it doesn't collide with the API path routed by the edge.
        path: 'keys',
        title: 'API keys · PostyFox',
        loadComponent: () =>
          import('./features/api-keys/api-keys.component').then((m) => m.ApiKeysComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

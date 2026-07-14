import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
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
        path: 'compose',
        title: 'Compose · PostyFox',
        loadComponent: () =>
          import('./features/compose/compose.component').then((m) => m.ComposeComponent),
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

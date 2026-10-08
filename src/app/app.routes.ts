import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { termsGuard } from './core/guards/terms.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

// Route titles are translation keys; TranslatedTitleStrategy renders them (issue #33).
export const routes: Routes = [
  {
    // Kept outside the guarded layout so it's reachable without an authenticated session.
    path: 'privacy',
    title: 'nav.privacyPolicy',
    loadComponent: () =>
      import('./features/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    // Public read-only view of the terms, reachable without a session like /privacy.
    path: 'tos',
    title: 'nav.termsOfService',
    loadComponent: () => import('./features/tos/tos.component').then((m) => m.TosComponent),
  },
  {
    // Outside the layout so it stays reachable while the API refuses everything else (issue #417).
    path: 'terms',
    title: 'nav.termsOfService',
    canActivate: [authGuard],
    loadComponent: () => import('./features/terms/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, termsGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'nav.dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'connectors',
        title: 'nav.connectors',
        loadComponent: () =>
          import('./features/connectors/connectors.component').then((m) => m.ConnectorsComponent),
      },
      {
        path: 'templates',
        title: 'nav.templates',
        loadComponent: () =>
          import('./features/templates/templates.component').then((m) => m.TemplatesComponent),
      },
      {
        path: 'tag-presets',
        title: 'nav.tagPresets',
        loadComponent: () =>
          import('./features/tag-presets/tag-presets.component').then((m) => m.TagPresetsComponent),
      },
      {
        path: 'text-templates',
        title: 'nav.textTemplates',
        loadComponent: () =>
          import('./features/text-templates/text-templates.component').then(
            (m) => m.TextTemplatesComponent,
          ),
      },
      {
        path: 'compose',
        title: 'nav.compose',
        loadComponent: () =>
          import('./features/compose/compose.component').then((m) => m.ComposeComponent),
      },
      {
        path: 'posts',
        pathMatch: 'full',
        title: 'nav.posts',
        loadComponent: () =>
          import('./features/posts/posts.component').then((m) => m.PostsComponent),
      },
      {
        path: 'posts/:id',
        title: 'nav.postStatus',
        loadComponent: () =>
          import('./features/post-status/post-status.component').then((m) => m.PostStatusComponent),
      },
      {
        path: 'triggers',
        title: 'nav.triggers',
        loadComponent: () =>
          import('./features/triggers/triggers.component').then((m) => m.TriggersComponent),
      },
      {
        path: 'admin',
        title: 'nav.administration',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'settings',
        title: 'nav.settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        // NB: kept off the `/api` prefix so it doesn't collide with the API path routed by the edge.
        path: 'keys',
        title: 'nav.apiKeys',
        loadComponent: () =>
          import('./features/api-keys/api-keys.component').then((m) => m.ApiKeysComponent),
      },
      {
        // Also the emailed invite link's landing page (?token=...), see AccessComponent.
        path: 'access',
        title: 'nav.manageAccess',
        loadComponent: () =>
          import('./features/access/access.component').then((m) => m.AccessComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

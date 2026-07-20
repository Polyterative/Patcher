import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from 'src/environments/environment';

const loadHomeComponent = () =>
  import('./features/backbone/home/home.component').then(m => m.HomeComponent);

const loadLegacyLinkGonePageComponent = () =>
  import('./features/backbone/legacy-link-gone/legacy-link-gone-page.component').then(m => m.LegacyLinkGonePageComponent);

const loadNotFoundComponent = () =>
  import('./features/backbone/404/not-found.component').then(m => m.NotFoundComponent);

const collectionRoutes: Routes = environment.features.collectionsEnabled
  ? [
      {
        path: 'collections',
        loadChildren: () => import('./features/module-collections/module-collections.module').then(m => m.ModuleCollectionsModule)
      },
      {
        path: 'collection/:collectionId',
        loadChildren: () => import('./features/module-collections/module-collections-owned.module').then(m => m.ModuleCollectionsOwnedModule)
      }
    ]
  : [];

export const marketplaceRoutes: Routes = environment.features.marketplaceEnabled
  ? [
      {
        path: 'marketplace',
        loadChildren: () => import('./features/routes/marketplace/marketplace.module').then(m => m.MarketplaceModule)
      }
    ]
  : [];

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: loadHomeComponent
  },
  {
    path: 'home',
    pathMatch: 'full',
    loadComponent: loadHomeComponent
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/backend/backend.module').then(m => m.BackendModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/backbone/login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: 'auth/login'
  },
  {
    path: 'signup',
    pathMatch: 'full',
    redirectTo: 'auth/signup'
  },
  {
    path: 'reset-password',
    pathMatch: 'full',
    redirectTo: 'auth/reset-password'
  },
  {
    path: 'complete-profile',
    pathMatch: 'full',
    redirectTo: 'auth/complete-profile'
  },
  {
    path: 'callback',
    pathMatch: 'full',
    redirectTo: 'auth/callback'
  },
  {
    path: 'u',
    loadChildren: () => import('./features/routes/public-profile/public-profile.module').then(m => m.PublicProfileModule)
  },
  {
    path: 'user/account',
    loadChildren: () => import('./features/backbone/user-management/user-management.module').then(m => m.UserManagementModule)
  },
  {
    path: 'user',
    loadChildren: () => import('./features/routes/user-area/user-area.module').then(m => m.UserAreaModule)
  },
  {
    path: 'racks',
    loadChildren: () => import('./features/routes/rack/rack-browser.module').then(m => m.RackBrowserModule)
  },
  {
    path: 'patches',
    loadChildren: () => import('./features/patch-browser/patch-browser.module').then(m => m.PatchBrowserModule)
  },
  {
    path: 'modules',
    loadChildren: () => import('./features/module-browser/module-browser.module').then(m => m.ModuleBrowserModule)
  },
  ...marketplaceRoutes,
  ...collectionRoutes,
  {
    path: 'manufacturers',
    loadChildren: () => import('./features/manufacturer-detail/manufacturer.module').then(m => m.ManufacturerModule)
  },
  {
    path: 'info',
    loadChildren: () => import('./features/info-pages/info-pages.module').then(m => m.InfoPagesModule)
  },
  {
    path:      'links/retired',
    loadComponent: loadLegacyLinkGonePageComponent
  },
  {
    path:      '404',
    loadComponent: loadNotFoundComponent
  },
  {
    path:       '**',
    redirectTo: '/404'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

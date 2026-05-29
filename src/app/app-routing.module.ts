import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/backbone/home/home.component';
import { LegacyLinkGonePageComponent } from './features/backbone/legacy-link-gone/legacy-link-gone-page.component';
import { NotFoundComponent } from './features/backbone/404/not-found.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent
  },
  {
    path: 'home',
    pathMatch: 'full',
    component: HomeComponent
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
    component: LegacyLinkGonePageComponent
  },
  {
    path:      '404',
    component: NotFoundComponent
  },
  {
    path:       '**',
    redirectTo: '/404'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

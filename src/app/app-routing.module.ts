import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/backbone/home/home.component';

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
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
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
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

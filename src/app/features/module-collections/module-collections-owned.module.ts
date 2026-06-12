import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes
} from '@angular/router';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ModuleCollectionPartsModule } from 'src/app/components/module-collection-parts/module-collection-parts.module';
import { AuthGuard } from '../backbone/login/user-auth-guard.service';
import { ModuleCollectionsOwnedDetailComponent } from './module-collections-owned-detail/module-collections-owned-detail.component';

export const moduleCollectionsOwnedRoutes: Routes = [
  {
    path: '',
    component: ModuleCollectionsOwnedDetailComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  declarations: [
    ModuleCollectionsOwnedDetailComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(moduleCollectionsOwnedRoutes),
    ModuleCollectionPartsModule,
    BrandPrimaryButtonComponent,
    EmptyStateComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent
  ]
})
export class ModuleCollectionsOwnedModule {}

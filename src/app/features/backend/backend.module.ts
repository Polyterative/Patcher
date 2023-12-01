import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { LuxonModule } from 'luxon-angular';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { BrandPrimaryButtonModule } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { LibGraphModule } from '../../shared-interproject/components/@visual/graph-view/lib-graph.module';
import { AdminGuardService } from './admin-guard.service';
import { AdminPanelRootComponent } from './admin-panel-root/admin-panel-root.component';
import { LocalStorageService } from './local-storage.service';
import { SupabaseService } from './supabase.service';

@NgModule({
  declarations: [
    AdminPanelRootComponent
  ],
  providers:    [
    AdminGuardService,
    LocalStorageService,
    UrlCreatorService,
    SupabaseService
  ],
  imports:      [
    CommonModule,
    MatSnackBarModule,
    LuxonModule,
    RouterModule.forRoot([
      {
        path:        'admin',
        component:   AdminPanelRootComponent,
        canActivate: [AdminGuardService]
      }
    ], {scrollPositionRestoration: 'enabled'}),
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    LibGraphModule
  ],
  exports:      [
    AdminPanelRootComponent
  ]
})
export class BackendModule {
}

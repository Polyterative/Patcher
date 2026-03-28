import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { LuxonModule } from 'luxon-angular';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { BrandPrimaryButtonModule } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { LibGraphModule } from '../../shared-interproject/components/@visual/graph-view/lib-graph.module';
import { AdminGuardService } from './admin-guard.service';
import { AdminPanelRootComponent } from './admin-panel-root/admin-panel-root.component';
import { AdminFlagsComponent } from './admin-panel-root/admin-flags/admin-flags.component';
import { LocalStorageService } from './local-storage.service';
import { SupabaseService } from './supabase.service';


@NgModule({
  declarations: [
    AdminPanelRootComponent,
    AdminFlagsComponent
  ],
  providers:    [
    AdminGuardService,
    LocalStorageService,
    UrlCreatorService,
    SupabaseService
  ],
  imports:      [
    CommonModule,
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
    LibGraphModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  exports:      [
    AdminPanelRootComponent
  ]
})
export class BackendModule {
}
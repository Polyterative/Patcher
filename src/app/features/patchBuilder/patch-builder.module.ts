import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { FlexLayoutModule }          from '@angular/flex-layout';
import { MatExpansionModule }        from '@angular/material/expansion';
import { MatIconModule }             from '@angular/material/icon';
import { RouterModule }              from '@angular/router';
import { BrandPrimaryButtonModule }  from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { ScreenWrapperModule }       from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { UserAuthGuard }             from '../backbone/login/user-auth-guard.service';
import { PatchBuilderDataService }   from './patch-builder-data.service';
import { PatchBuilderRootComponent } from './patch-builder-root.component';

@NgModule({
  declarations: [
    PatchBuilderRootComponent
  ],
  providers:    [PatchBuilderDataService],
  imports:      [
    CommonModule,
    RouterModule.forRoot([
      {
        path:     'builder',
        children: [
          {
            path:        'new',
            component:   PatchBuilderRootComponent,
            canActivate: [UserAuthGuard]
          }
        ]
        // pathMatch: 'full'
      }
    ]),
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    ScreenWrapperModule,
    MatExpansionModule,
    MatIconModule
  ],
  exports:      [
    PatchBuilderRootComponent
  ]
})
export class PatchBuilderModule {}

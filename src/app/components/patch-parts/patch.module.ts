import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDividerModule }         from '@angular/material/divider';
import { MatIconModule }            from '@angular/material/icon';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { RouterModule }             from '@angular/router';
import { PatchDetailDataService }   from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchEditorComponent }     from 'src/app/components/patch-parts/patch-editor/patch-editor.component';
import { PatchMinimalComponent }    from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { MatFormEntityModule }      from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';


@NgModule({
  declarations: [
    PatchEditorComponent,
    PatchMinimalComponent
  ],
  exports:      [
    PatchMinimalComponent,
    PatchEditorComponent
  ],
  providers:    [PatchDetailDataService],
  imports:      [
    CommonModule,
    MatCardModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class PatchModule {}

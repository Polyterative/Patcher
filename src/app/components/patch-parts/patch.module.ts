import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDividerModule }         from '@angular/material/divider';
import { MatIconModule }            from '@angular/material/icon';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { RouterModule }             from '@angular/router';
import { TimeagoModule }            from 'ngx-timeago';
import { PatchDetailDataService }   from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchEditorComponent }     from 'src/app/components/patch-parts/patch-editor/patch-editor.component';
import { PatchMinimalComponent }    from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { SharedAtomsModule }        from 'src/app/components/shared-atoms/shared-atoms.module';
import { MatFormEntityModule }      from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroInfoBoxModule }        from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';


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
    TimeagoModule.forChild(),
    MatCardModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule,
    HeroInfoBoxModule,
    SharedAtomsModule
  ]
})
export class PatchModule {}

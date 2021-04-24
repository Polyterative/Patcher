import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatChipsModule }           from '@angular/material/chips';
import { MatDividerModule }         from '@angular/material/divider';
import { MatIconModule }            from '@angular/material/icon';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { RouterModule }             from '@angular/router';
import { TimeagoModule }            from 'ngx-timeago';
import { PatchConnectionModule }    from 'src/app/components/patch-connection/patch-connection.module';
import { PatchDetailDataService }   from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchDetailsComponent }    from 'src/app/components/patch-parts/patch-details/patch-details.component';
import { PatchEditorComponent }     from 'src/app/components/patch-parts/patch-editor/patch-editor.component';
import { PatchMinimalComponent }    from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { SharedAtomsModule }        from 'src/app/components/shared-atoms/shared-atoms.module';
import { DevOnlyWindowModule }      from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { MatFormEntityModule }      from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroInfoBoxModule }        from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';


@NgModule({
  declarations: [
    PatchEditorComponent,
    PatchMinimalComponent,
    PatchDetailsComponent
  ],
  exports:      [
    PatchMinimalComponent,
    PatchEditorComponent,
    PatchDetailsComponent
  ],
  providers:    [PatchDetailDataService],
  imports: [
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
    SharedAtomsModule,
    MatChipsModule,
    DevOnlyWindowModule,
    PatchConnectionModule
  ]
})
export class PatchModule {}

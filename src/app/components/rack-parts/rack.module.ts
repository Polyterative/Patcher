import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatDividerModule }         from '@angular/material/divider';
import { MatIconModule }            from '@angular/material/icon';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { RouterModule }             from '@angular/router';
import { RackDetailDataService }    from 'src/app/components/rack-parts/rack-detail-data.service';
import { RackEditorComponent }      from 'src/app/components/rack-parts/rack-editor/rack-editor.component';
import { RackMinimalComponent }     from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SharedAtomsModule }        from 'src/app/components/shared-atoms/shared-atoms.module';
import { MatFormEntityModule }      from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { RackCreatorComponent }     from './rack-creator/rack-creator.component';


@NgModule({
  declarations: [
    RackEditorComponent,
    RackMinimalComponent,
    RackCreatorComponent
  ],
  exports:      [
    RackMinimalComponent,
    RackEditorComponent,
    RackCreatorComponent
  ],
  providers:    [RackDetailDataService],
  imports: [
    CommonModule,
    MatCardModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    SharedAtomsModule
  ]
})
export class RackModule {}

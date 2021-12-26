import { DragDropModule }           from '@angular/cdk/drag-drop';
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
import { ModulePartsModule }        from 'src/app/components/module-parts/module-parts.module';
import { RackDetailDataService }    from 'src/app/components/rack-parts/rack-detail-data.service';
import { RackDetailsComponent }     from 'src/app/components/rack-parts/rack-details/rack-details.component';
import { RackEditorComponent }      from 'src/app/components/rack-parts/rack-editor/rack-editor.component';
import { RackMinimalComponent }     from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { RackModuleAdderComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder.component';
import { SharedAtomsModule }        from 'src/app/components/shared-atoms/shared-atoms.module';
import { ModuleBrowserModule }      from 'src/app/features/module-browser/module-browser.module';
import { MatFormEntityModule }      from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule }     from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroClickableTitleModule } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { HeroInfoBoxModule }        from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { CleanCardModule }          from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule }    from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { RackCreatorComponent }     from './rack-creator/rack-creator.component';
import { TotalHpOfModulesPipe }     from './total-hp-of-modules.pipe';


@NgModule({
  declarations: [
    RackEditorComponent,
    RackMinimalComponent,
    RackCreatorComponent,
    RackModuleAdderComponent,
    RackDetailsComponent,
    TotalHpOfModulesPipe
  ],
  exports:      [
    RackMinimalComponent,
    RackEditorComponent,
    RackCreatorComponent,
    RackModuleAdderComponent,
    RackDetailsComponent
  ],
  providers:    [RackDetailDataService],
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
    MatTooltipModule,
    MatDialogModule,
    SharedAtomsModule,
    ModuleBrowserModule,
    FlexboxRowFastModule,
    ModulePartsModule,
    HeroInfoBoxModule,
    HeroClickableTitleModule,
    HeroContentCardModule,
    CleanCardModule,
    DragDropModule
  ]
})
export class RackModule {}

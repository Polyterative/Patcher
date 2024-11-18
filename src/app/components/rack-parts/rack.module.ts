import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { RackDetailsComponent } from 'src/app/components/rack-parts/rack-details/rack-details.component';
import { RackEditorComponent } from 'src/app/components/rack-parts/rack-editor/rack-editor.component';
import { RackMinimalComponent } from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { RackModuleAdderDialogComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroClickableTitleModule } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { HeroInfoBoxModule } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { AutoContentLoadingIndicatorModule } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { GeneralContextMenuModule } from '../../shared-interproject/components/@smart/general-context-menu/general-context-menu.module';
import { BrandLogoModule } from '../../shared-interproject/components/@visual/brand-logo/brand-logo.module';
import { CleanCardModule } from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule } from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { RackMicroModule } from '../rack-micro/rack-micro.module';
import { MapToModulePipe } from './map-to-module.pipe';
import { RackCreatorComponent } from './rack-creator/rack-creator.component';
import { RackDetailsRemainingIndicatorComponent } from './rack-details/rack-details-remaining-indicator/rack-details-remaining-indicator.component';
import { HasUnrackedModulesPipe } from './rack-editor/rack-visual-model/has-unracked-modules.pipe';
import { RackVisualModelComponent } from './rack-editor/rack-visual-model/rack-visual-model.component';
import { RackedToModulesPipe } from './racked-to-modules.pipe';
import { TotalHpOfModulesPipe } from './total-hp-of-modules.pipe';
import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { TotalModulesOfRackPipe } from './total-modules-of-rack.pipe';
import { InputDialogModule } from "../../shared-interproject/dialogs/input-dialog/input-dialog.module";
import { StatisticsModule } from "src/app/components/shared-atoms/statistics/statistics.module";
import { MatDialogModule } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { AdviceTooltipModule } from "src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip.module";
import { MatBadge } from "@angular/material/badge";
import { CalculateRowInformationPipe } from "src/app/components/rack-parts/rack-editor/calculate-row-information.pipe";
import { RackImageComponent } from "src/app/components/rack-parts/rack-image/rack-image.component";
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import { LibShowcaseGridComponent, } from "src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component";
import { TotalPowerOfRackPipe } from "src/app/components/rack-parts/total-power-of-rack.pipe";
import { TotalMissingPowerDataInRackPipe } from "src/app/components/rack-parts/total-missing-power-data-in-rack.pipe";
import { TotalDepthOfRackPipe } from "src/app/components/rack-parts/total-depth-of-rack.pipe";
import { TotalWeightOfRackPipe } from "src/app/components/rack-parts/total-weight-of-rack.pipe";


@NgModule({
  declarations: [
    RackEditorComponent,
    RackMinimalComponent,
    RackCreatorComponent,
    RackModuleAdderDialogComponent,
    RackDetailsComponent,
    TotalHpOfModulesPipe,
    RackDetailsRemainingIndicatorComponent,
    TotalHpOfRackPipe,
    TotalModulesOfRackPipe,
    MapToModulePipe,
    RackedToModulesPipe,
    RackVisualModelComponent,
    HasUnrackedModulesPipe
  ],
  exports: [
    RackMinimalComponent,
    RackEditorComponent,
    RackCreatorComponent,
    RackModuleAdderDialogComponent,
    RackDetailsComponent,
    RackDetailsRemainingIndicatorComponent,
    RackVisualModelComponent
  ],
  providers: [RackDetailDataService],
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
    SharedAtomsModule,
    ModuleBrowserModule,
    FlexboxRowFastModule,
    ModulePartsModule,
    HeroInfoBoxModule,
    HeroClickableTitleModule,
    HeroContentCardModule,
    CleanCardModule,
    DragDropModule,
    BrandLogoModule,
    ScreenWrapperModule,
    AutoContentLoadingIndicatorModule,
    GeneralContextMenuModule,
    RackMicroModule,
    MatSlideToggleModule,
    InputDialogModule,
    StatisticsModule,
    AdviceTooltipModule,
    MatBadge,
    CalculateRowInformationPipe,
    RackImageComponent,
    LabelValueShowcaseModule,
    LibShowcaseGridComponent,
    TotalPowerOfRackPipe,
    TotalMissingPowerDataInRackPipe,
    TotalDepthOfRackPipe,
    TotalWeightOfRackPipe,
  ]
})
export class RackModule {
}
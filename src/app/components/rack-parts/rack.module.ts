import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { RackDetailsComponent } from 'src/app/components/rack-parts/rack-details/rack-details.component';
import { RackEditorComponent } from 'src/app/components/rack-parts/rack-editor/rack-editor.component';
import { RackMinimalComponent } from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { RackModuleAdderDialogComponent } from 'src/app/components/rack-parts/rack-module-adder/rack-module-adder-dialog.component';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { DialogInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/dialog-info-box/dialog-info-box.component';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { AutoContentLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { GeneralContextMenuModule } from '../../shared-interproject/components/@smart/general-context-menu/general-context-menu.module';
import { BrandLogoModule } from '../../shared-interproject/components/@visual/brand-logo/brand-logo.module';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { RackMicroModule } from '../rack-micro/rack-micro.module';
import { MapToModulePipe } from './map-to-module.pipe';
import { RackCreatorComponent } from './rack-creator/rack-creator.component';
import { RackDetailsRemainingIndicatorComponent } from './rack-details/rack-details-remaining-indicator/rack-details-remaining-indicator.component';
import { RackBalancePanelComponent } from './rack-balance-panel/rack-balance-panel.component';
import { HasUnrackedModulesPipe } from './rack-editor/rack-visual-model/has-unracked-modules.pipe';
import { HasUnrackedModulesListPipe } from './rack-editor/rack-visual-model/has-unracked-modules-list.pipe';
import { RackVisualModelComponent } from './rack-editor/rack-visual-model/rack-visual-model.component';
import { RackedToModulesPipe } from './racked-to-modules.pipe';
import { TotalHpOfModulesPipe } from './total-hp-of-modules.pipe';
import { TotalHpOfRackPipe } from './total-hp-of-rack.pipe';
import { TotalModulesOfRackPipe } from './total-modules-of-rack.pipe';
import { TotalPlacedModulesOfRackPipe } from './total-placed-modules-of-rack.pipe';
import { StatisticsComponent } from "src/app/components/shared-atoms/statistics/statistics.component";
import { MatDialogModule } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AdviceTooltipComponent } from "src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component";
import { MatBadge } from "@angular/material/badge";
import { CalculateRowInformationPipe } from "src/app/components/rack-parts/rack-editor/calculate-row-information.pipe";
import { RackImageComponent } from "src/app/components/rack-parts/rack-image/rack-image.component";
import { LabelValueShowcaseComponent } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component";
import { LibShowcaseGridComponent, } from "src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component";
import { TotalPowerOfRackPipe } from "src/app/components/rack-parts/total-power-of-rack.pipe";
import { TotalMissingPowerDataInRackPipe } from "src/app/components/rack-parts/total-missing-power-data-in-rack.pipe";
import { TotalDepthOfRackPipe } from "src/app/components/rack-parts/total-depth-of-rack.pipe";
import { TotalWeightOfRackPipe } from "src/app/components/rack-parts/total-weight-of-rack.pipe";
import { EditFabComponent } from "src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component";
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import { InputDialogModule } from "src/app/shared-interproject/dialogs/input-dialog/input-dialog.module";


@NgModule({
  declarations: [
    RackEditorComponent,
    RackMinimalComponent,
    RackCreatorComponent,
    RackModuleAdderDialogComponent,
    RackDetailsComponent,
    RackBalancePanelComponent,
    TotalHpOfModulesPipe,
    RackDetailsRemainingIndicatorComponent,
    TotalHpOfRackPipe,
    TotalModulesOfRackPipe,
    TotalPlacedModulesOfRackPipe,
    MapToModulePipe,
    RackedToModulesPipe,
    RackVisualModelComponent,
    HasUnrackedModulesPipe,
    HasUnrackedModulesListPipe
  ],
  exports: [
    RackMinimalComponent,
    RackEditorComponent,
    RackCreatorComponent,
    RackModuleAdderDialogComponent,
    RackDetailsComponent,
    RackBalancePanelComponent,
    RackDetailsRemainingIndicatorComponent,
    RackVisualModelComponent,
    LibShowcaseGridComponent,
    TotalHpOfRackPipe,
    TotalModulesOfRackPipe,
    TotalPowerOfRackPipe,
    TotalMissingPowerDataInRackPipe,
    TotalDepthOfRackPipe,
    TotalWeightOfRackPipe
  ],
  providers: [RackDetailDataService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    BrandPrimaryButtonComponent,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityComponent,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    SharedAtomsModule,
    FlexboxRowFastComponent,
    ModulePartsModule,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective,
    HeroClickableTitleComponent,
    HeroContentCardComponent,
    CleanCardComponent,
    DragDropModule,
    BrandLogoModule,
    ScreenWrapperComponent,
    AutoContentLoadingIndicatorComponent,
    GeneralContextMenuModule,
    RackMicroModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    StatisticsComponent,
    AdviceTooltipComponent,
    DialogInfoBoxComponent,
    MatBadge,
    CalculateRowInformationPipe,
    RackImageComponent,
    LabelValueShowcaseComponent,
    LibShowcaseGridComponent,
    TotalPowerOfRackPipe,
    TotalMissingPowerDataInRackPipe,
    TotalDepthOfRackPipe,
    TotalWeightOfRackPipe,
    EditFabComponent,
    EmptyStateTipsComponent,
    InputDialogModule,
  ]
})
export class RackModule {
}

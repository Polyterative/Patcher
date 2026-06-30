import {
  CommonModule,
  NgOptimizedImage
} from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { AutoContentLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { MatFormEntityComponent } from '../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { FormValidPipe } from '../../shared-interproject/components/@smart/mat-form-entity/is-control-valid.pipe';
import { RestrictedEntityComponent } from '../../shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { AdviceTooltipComponent } from '../../shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { BrandPrimaryButtonComponent } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroInfoBoxComponent } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { LabelValueShowcaseComponent } from '../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { GetModuleHeightForStandardPipe } from './get-module-height-for-standard.pipe';
import { ModuleCvIconComponent } from './module-cv-icon/module-cv-icon.component';
import { ModuleCVItemComponent } from './module-cvitem/module-cvitem.component';
import { ModuleCVsComponent } from './module-cvs/module-cvs.component';
import { ModuleDetailDataService } from './module-detail-data.service';
import { ModuleDetailsComponent } from './module-details/module-details.component';
import { ModuleFlagComponent } from './module-flag/module-flag.component';
import { ModuleMinimalComponent } from './module-minimal/module-minimal.component';
import { ModulePartDescriptionComponent } from './module-minimal/module-part-description/module-part-description.component';
import { ModulePartHpComponent } from './module-minimal/module-part-hp/module-part-hp.component';
import { ModulePartImageComponent } from './module-minimal/module-part-image/module-part-image.component';
import { ModulePartManufacturerComponent } from './module-minimal/module-part-manufacturer/module-part-manufacturer.component';
import { ModulePartNameComponent } from './module-minimal/module-part-name/module-part-name.component';
import { ModuleTagsComponent } from './module-minimal/module-tags/module-tags.component';
import { OnlyTagOfTypePipe } from './module-minimal/module-tags/only-tag-of-type.pipe';
import { OrderTagsByTypePipe } from './module-minimal/module-tags/order-tags-by-type.pipe';
import { ModuleRealisticHolelineComponent } from './module-realistic/module-realistic-holeline/module-realistic-holeline.component';
import { ModuleRealisticComponent } from './module-realistic/module-realistic.component';
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatMenuModule } from "@angular/material/menu";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatSelectModule } from "@angular/material/select";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogModule } from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.module';
import { FormsModule } from "@angular/forms";
import { ReactiveFormsModule } from '@angular/forms';
import { CopyableDirective } from "src/app/shared-interproject/app-copy-on-click.directive";
import { ModulePanelZoomDialogComponent } from './module-details/module-panel-zoom-dialog.component';
import { ModulePossessionDialogComponent } from './module-possession-dialog/module-possession-dialog.component';
import { DescriptionKeywordHighlightPipe } from './shared-pipes/description-keyword-highlight.pipe';
import { CoolButtonComponent } from '../shared-atoms/cool-button/cool-button.component';
import { RackModuleAdderDialogComponent } from '../rack-parts/rack-module-adder/rack-module-adder-dialog.component';


@NgModule({
  declarations: [
    ModuleCVItemComponent,
    ModuleCVsComponent,
    ModuleDetailsComponent,
    ModuleFlagComponent,
    ModuleMinimalComponent,
    ModuleCvIconComponent,
    ModuleRealisticComponent,
    ModulePartNameComponent,
    ModulePartDescriptionComponent,
    ModulePartManufacturerComponent,
    ModulePartHpComponent,
    ModuleRealisticHolelineComponent,
    ModuleTagsComponent,
    OnlyTagOfTypePipe,
    OrderTagsByTypePipe,
    GetModuleHeightForStandardPipe,
    ModulePartImageComponent,
    ModulePanelZoomDialogComponent,
    ModulePossessionDialogComponent,
    RackModuleAdderDialogComponent,
    DescriptionKeywordHighlightPipe
  ],
  providers:    [
    ModuleDetailDataService
  ],
  imports: [
    CommonModule,
    TimeagoModule.forChild(),
    MatCardModule,
    BrandPrimaryButtonComponent,
    MatDividerModule,
    MatFormEntityComponent,
    FormValidPipe,
    MatChipsModule,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDialogModule,
    RestrictedEntityComponent,
    RouterModule,
    SharedAtomsModule,
    HeroClickableTitleComponent,
    AutoContentLoadingIndicatorComponent,
    AdviceTooltipComponent,
    AutoUpdateLoadingIndicatorComponent,
    CleanCardComponent,
    MatMenuModule,
    LabelValueShowcaseComponent,
    ScreenWrapperComponent,
    MatExpansionModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
    ConfirmDialogModule,
    FormsModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    CopyableDirective,
    CoolButtonComponent
  ],
  exports:      [
    ModuleCVItemComponent,
    ModuleCVsComponent,
    ModuleDetailsComponent,
    ModuleMinimalComponent,
    ModuleCvIconComponent,
    ModuleRealisticComponent,
    ModulePartNameComponent,
    ModulePartDescriptionComponent,
    ModulePartManufacturerComponent,
    ModulePartHpComponent,
    ModuleRealisticHolelineComponent,
    ModuleTagsComponent,
    ModulePartImageComponent,
    RackModuleAdderDialogComponent
  ]
})
export class ModulePartsModule {}

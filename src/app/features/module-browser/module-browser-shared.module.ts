import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatMenu,
  MatMenuItem,
  MatMenuTrigger
} from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModuleEditorModule } from 'src/app/components/module-parts/module-editor/module-editor.module';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { LibShowcaseGridComponent } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { CommentsModule } from 'src/app/components/shared-atoms/comments/comments.module';
import { CoolButtonComponent } from 'src/app/components/shared-atoms/cool-button/cool-button.component';
import { RecentActivityModule } from 'src/app/components/shared-atoms/recent-activity/recent-activity.module';
import { ManufacturerRowComponent } from 'src/app/features/manufacturer-detail/manufacturer-browser-root/manufacturer-row/manufacturer-row.component';
import { ModuleBrowserDetailComponent } from 'src/app/features/module-browser/module-browser-detail/module-browser-detail.component';
import { ModuleCompositeComponent } from 'src/app/features/module-browser/module-composite/module-composite.component';
import { CopyableDirective } from 'src/app/shared-interproject/app-copy-on-click.directive';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { RestrictedEntityComponent } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { AdviceTooltipComponent } from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { EditFabComponent } from 'src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ModulePatchesModule } from '../../components/module-patches/module-patches.module';
import { ModuleRacksModule } from '../../components/module-racks/module-racks.module';
import { ModuleBrowserRootModule } from './module-browser-root/module-browser-root.module';
import { ModuleDetailDataCardComponent } from './module-browser-detail/module-detail-data-card/module-detail-data-card.component';
import { ModuleUsageCardComponent } from './module-browser-detail/module-usage-card/module-usage-card.component';
import { ModuleListModule } from './module-list/module-list.module';

/**
 * Non-routing slice of ModuleBrowserModule. See PatchBrowserSharedModule
 * for the rationale. Used by both ModuleBrowserModule (which adds the
 * routing layer) and HomeComponent's proof showcases.
 */
@NgModule({
  declarations: [
    ModuleBrowserDetailComponent,
    ModuleCompositeComponent,
    ModuleDetailDataCardComponent,
    ModuleUsageCardComponent
  ],
  exports: [
    ModuleBrowserDetailComponent,
    ModuleCompositeComponent
  ],
  imports: [
    CommonModule,
    ModuleBrowserRootModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    ScrollingModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatToolbarModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    HeroContentCardComponent,
    LabelValueShowcaseComponent,
    ScreenWrapperComponent,
    BrandPrimaryButtonComponent,
    AutoContentLoadingIndicatorComponent,
    AutoUpdateLoadingIndicatorComponent,
    MatFormEntityComponent,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective,
    RestrictedEntityComponent,
    ModulePartsModule,
    CleanCardComponent,
    ModuleRacksModule,
    ModulePatchesModule,
    AdviceTooltipComponent,
    ModuleListModule,
    ModuleEditorModule,
    CommentsModule,
    CoolButtonComponent,
    CopyableDirective,
    LibShowcaseGridComponent,
    EditFabComponent,
    ManufacturerRowComponent,
    RecentActivityModule
  ]
})
export class ModuleBrowserSharedModule {}

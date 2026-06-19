import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { RackListModule } from 'src/app/components/rack-list/rack-list.module';
import { RackModule } from 'src/app/components/rack-parts/rack.module';
import { CommentsModule } from 'src/app/components/shared-atoms/comments/comments.module';
import { CoolButtonComponent } from 'src/app/components/shared-atoms/cool-button/cool-button.component';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { ModuleBrowserRootModule } from 'src/app/features/module-browser/module-browser-root/module-browser-root.module';
import { RackBrowserDataService } from 'src/app/features/routes/rack/rack-browser-data.service';
import { RackBrowserDetailViewComponent } from 'src/app/features/routes/rack/rack-browser-detail/rack-browser-detail-view.component';
import { RackCompositeComponent } from 'src/app/features/routes/rack/rack-composite/rack-composite.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { RestrictedEntityComponent } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { AdviceTooltipComponent } from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';

/**
 * Non-routing slice of RackBrowserModule. See PatchBrowserSharedModule
 * for the rationale. Used by both RackBrowserModule (which adds the
 * routing layer) and HomeComponent's proof showcases.
 */
@NgModule({
  declarations: [
    RackBrowserDetailViewComponent,
    RackCompositeComponent
  ],
  exports: [
    RackBrowserDetailViewComponent,
    RackCompositeComponent
  ],
  providers: [RackBrowserDataService],
  imports: [
    CommonModule,
    RackModule,
    ModuleBrowserRootModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
    MatInputModule,
    MatToolbarModule,
    DragDropModule,
    ScrollingModule,
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
    RackListModule,
    StatisticsComponent,
    CommentsModule,
    CoolButtonComponent,
    SharedAtomsModule,
    AdviceTooltipComponent
  ]
})
export class RackBrowserSharedModule {}

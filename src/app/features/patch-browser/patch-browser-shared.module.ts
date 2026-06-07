import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { PatchListModule } from 'src/app/components/patch-list/patch-list.module';
import { CommentsModule } from 'src/app/components/shared-atoms/comments/comments.module';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { PatchBrowserDetailViewComponent } from 'src/app/features/patch-browser/patch-browser-detail/patch-browser-detail-view.component';
import { PatchCompositeComponent } from 'src/app/features/patch-browser/patch-composite/patch-composite.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { RestrictedEntityComponent } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';

/**
 * Non-routing slice of PatchBrowserModule. Holds the patch detail view
 * component (and its template-used cousin PatchCompositeComponent) so it
 * can be reused outside the /patches lazy route — e.g. inside the home
 * proof showcases — without dragging in the route registration and
 * tripping the route-leakage guard.
 */
@NgModule({
  declarations: [
    PatchBrowserDetailViewComponent,
    PatchCompositeComponent
  ],
  exports: [
    PatchBrowserDetailViewComponent,
    PatchCompositeComponent
  ],
  providers: [PatchBrowserDataService],
  imports: [
    CommonModule,
    PatchModule,
    FlexLayoutModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
    MatPaginatorModule,
    MatSlideToggleModule,
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
    PatchListModule,
    CommentsModule,
    StatisticsComponent,
    SharedAtomsModule
  ]
})
export class PatchBrowserSharedModule {}

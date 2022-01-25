import { ScrollingModule as ExperimentalScrollingModule } from '@angular/cdk-experimental/scrolling';
import { ScrollingModule }                                from '@angular/cdk/scrolling';
import { CommonModule }                                   from '@angular/common';
import { NgModule }                                       from '@angular/core';
import { FlexLayoutModule }                               from '@angular/flex-layout';
import { MatButtonModule }                                from '@angular/material/button';
import { MatCardModule }                                  from '@angular/material/card';
import { MatChipsModule }                                 from '@angular/material/chips';
import { MatDialogModule }                                from '@angular/material/dialog';
import { MatDividerModule }                               from '@angular/material/divider';
import { MatExpansionModule }                             from '@angular/material/expansion';
import { MatIconModule }                                  from '@angular/material/icon';
import { MatToolbarModule }                               from '@angular/material/toolbar';
import { MatTooltipModule }                               from '@angular/material/tooltip';
import { RouterModule }                                   from '@angular/router';
import { TimeagoModule }                                  from 'ngx-timeago';
import { PatchConnectionModule }                          from 'src/app/components/patch-connection/patch-connection.module';
import { PatchCreatorComponent }                          from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import { PatchDetailDataService }                         from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchDetailsComponent }                          from 'src/app/components/patch-parts/patch-details/patch-details.component';
import { PatchEditorComponent }                           from 'src/app/components/patch-parts/patch-editor/patch-editor.component';
import { PatchMinimalComponent }                          from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { SharedAtomsModule }                              from 'src/app/components/shared-atoms/shared-atoms.module';
import { UserModulesModule }                              from 'src/app/features/user-area/user-modules/user-modules.module';
import { DevOnlyWindowModule }                            from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { MatFormEntityModule }                            from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { AdviceTooltipModule }                            from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip.module';
import { BrandPrimaryButtonModule }                       from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroClickableTitleModule }                       from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { HeroContentCardModule }                          from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule }                              from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { ConfirmDialogModule }                            from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.module';
import { AutoContentLoadingIndicatorModule }              from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { AutoUpdateLoadingIndicatorModule }               from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { CleanCardModule }                                from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { LibGraphModule }                                 from '../../shared-interproject/components/@visual/graph-view/lib-graph.module';
import { PatchConnectionsListComponent }                  from './patch-editor/patch-connections-list/patch-connections-list.component';
import { PatchGraphComponent }                            from './patch-graph/patch-graph.component';

@NgModule({
  declarations: [
    PatchEditorComponent,
    PatchMinimalComponent,
    PatchCreatorComponent,
    PatchDetailsComponent,
    PatchGraphComponent,
    PatchConnectionsListComponent
  ],
  exports:      [
    PatchMinimalComponent,
    PatchEditorComponent,
    PatchDetailsComponent,
    PatchGraphComponent,
    PatchConnectionsListComponent
  ],
  providers:    [PatchDetailDataService],
  imports:      [
    CommonModule,
    ConfirmDialogModule,
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
    PatchConnectionModule,
    UserModulesModule,
    MatToolbarModule,
    AdviceTooltipModule,
    HeroContentCardModule,
    MatDialogModule,
    HeroClickableTitleModule,
    MatExpansionModule,
    AutoContentLoadingIndicatorModule,
    ScrollingModule,
    ExperimentalScrollingModule,
    AutoUpdateLoadingIndicatorModule,
    CleanCardModule,
    LibGraphModule
  ]
})
export class PatchModule {}

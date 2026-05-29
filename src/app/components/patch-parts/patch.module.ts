import { ScrollingModule as ExperimentalScrollingModule } from '@angular/cdk-experimental/scrolling';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { PatchConnectionModule } from 'src/app/components/patch-connection/patch-connection.module';
import { PatchCreatorComponent } from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { PatchDetailsComponent } from 'src/app/components/patch-parts/patch-details/patch-details.component';
import { PatchEditorComponent } from 'src/app/components/patch-parts/patch-editor/patch-editor.component';
import { PatchMinimalComponent } from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { UserModulesModule } from 'src/app/features/routes/user-area/user-modules/user-modules.module';
import { DevOnlyWindowComponent } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window/dev-only-window.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { AdviceTooltipComponent } from 'src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { DialogInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/dialog-info-box/dialog-info-box.component';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { ConfirmDialogModule } from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.module';
import { AutoContentLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { LibGraphModule } from '../../shared-interproject/components/@visual/graph-view/lib-graph.module';
import { PatchMicroModule } from '../patch-micro/patch-micro.module';
import { PatchConnectionsListComponent } from './patch-connections-list/patch-connections-list.component';
import { PatchGraphComponent } from './patch-graph/patch-graph.component';
import { MatDialogModule } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LibShowcaseGridComponent } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { FormValidPipe } from 'src/app/shared-interproject/components/@smart/mat-form-entity/is-control-valid.pipe';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { PatchConnectionStatsPipe } from 'src/app/components/patch-parts/patch-connection-stats.pipe';
import { PatchConnectionUniqueModulesPipe } from 'src/app/components/patch-parts/patch-connection-unique-modules.pipe';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { EditFabComponent } from 'src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';


@NgModule({
  declarations: [
    PatchEditorComponent,
    PatchMinimalComponent,
    PatchCreatorComponent,
    PatchDetailsComponent,
    PatchGraphComponent,
    PatchConnectionsListComponent,
    PatchConnectionStatsPipe,
    PatchConnectionUniqueModulesPipe
  ],
  exports:      [
    PatchMinimalComponent,
    PatchEditorComponent,
    PatchDetailsComponent,
    PatchGraphComponent,
    PatchConnectionsListComponent,
    PatchConnectionStatsPipe,
    PatchConnectionUniqueModulesPipe
  ],
  providers:    [PatchDetailDataService, RackDetailDataService],
  imports: [
    CommonModule,
    ConfirmDialogModule,
    TimeagoModule.forChild(),
    MatCardModule,
    ReactiveFormsModule,
    BrandPrimaryButtonComponent,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityComponent,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective,
    SharedAtomsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    DevOnlyWindowComponent,
    PatchConnectionModule,
    UserModulesModule,
    MatToolbarModule,
    AdviceTooltipComponent,
    DialogInfoBoxComponent,
    HeroContentCardComponent,
    MatDialogModule,
    HeroClickableTitleComponent,
    MatExpansionModule,
    AutoContentLoadingIndicatorComponent,
    ScrollingModule,
    ExperimentalScrollingModule,
    AutoUpdateLoadingIndicatorComponent,
    CleanCardComponent,
    LibGraphModule,
    PatchMicroModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    LibShowcaseGridComponent,
    FormValidPipe,
    StatisticsComponent,
    FlexboxRowFastComponent,
    EmptyStateTipsComponent,
    ModulePartsModule,
    EditFabComponent
  ]
})
export class PatchModule {}

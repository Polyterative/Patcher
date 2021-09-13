import { CommonModule }                      from '@angular/common';
import { NgModule }                          from '@angular/core';
import { FlexLayoutModule }                  from '@angular/flex-layout';
import { MatButtonModule }                   from '@angular/material/button';
import { MatCardModule }                     from '@angular/material/card';
import { MatChipsModule }                    from '@angular/material/chips';
import { MatDividerModule }                  from '@angular/material/divider';
import { MatIconModule }                     from '@angular/material/icon';
import { MatTooltipModule }                  from '@angular/material/tooltip';
import { RouterModule }                      from '@angular/router';
import { TimeagoModule }                     from 'ngx-timeago';
import { SharedAtomsModule }                 from 'src/app/components/shared-atoms/shared-atoms.module';
import { HeroClickableTitleModule }          from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { SharedPipesModule }                 from 'src/app/shared-interproject/pipes/shared-pipes.module';
import { AutoContentLoadingIndicatorModule } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { AutoUpdateLoadingIndicatorModule }  from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { MatFormEntityModule }               from '../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule }            from '../../shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { AdviceTooltipModule }               from '../../shared-interproject/components/@visual/advice-tooltip/advice-tooltip.module';
import { BrandPrimaryButtonModule }          from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroInfoBoxModule }                 from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { ModuleCvIconComponent }             from './module-cv-icon/module-cv-icon.component';
import { ModuleCVItemComponent }             from './module-cvitem/module-cvitem.component';
import { ModuleCVsComponent }                from './module-cvs/module-cvs.component';
import { ModuleDetailDataService }           from './module-detail-data.service';
import { ModuleDetailsComponent }            from './module-details/module-details.component';
import { ModuleEditorComponent }             from './module-editor/module-editor.component';
import { ModuleMinimalComponent }            from './module-minimal/module-minimal.component';

@NgModule({
  declarations: [
    ModuleCVItemComponent,
    ModuleCVsComponent,
    ModuleDetailsComponent,
    ModuleEditorComponent,
    ModuleMinimalComponent,
    ModuleCvIconComponent
  ],
  providers:    [
    ModuleDetailDataService
  ],
  imports:      [
    CommonModule,
    TimeagoModule.forChild(),
    MatCardModule,
    BrandPrimaryButtonModule,
    FlexLayoutModule,
    MatDividerModule,
    MatFormEntityModule,
    MatChipsModule,
    HeroInfoBoxModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    RestrictedEntityModule,
    RouterModule,
    SharedAtomsModule,
    SharedPipesModule,
    HeroClickableTitleModule,
    AutoContentLoadingIndicatorModule,
    AdviceTooltipModule,
    AutoUpdateLoadingIndicatorModule
  ],
  exports:      [
    ModuleCVItemComponent,
    ModuleCVsComponent,
    ModuleDetailsComponent,
    ModuleEditorComponent,
    ModuleMinimalComponent,
    ModuleCvIconComponent
  ]
})
export class ModulePartsModule {}

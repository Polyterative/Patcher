import { CommonModule }                   from '@angular/common';
import { NgModule }                       from '@angular/core';
import { FlexLayoutModule }               from '@angular/flex-layout';
import { MatIconModule }                  from '@angular/material/icon';
import { TimeagoModule }                  from 'ngx-timeago';
import { RouterModule }                   from '@angular/router';
import { HeroInfoBoxModule }              from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { EntityAuthorComponent }          from './entity-author/entity-author.component';
import { PatchConnectionSymbolComponent } from './patch-connection-symbol/patch-connection-symbol.component';
import { TimestampsRelativeComponent }    from './timestamps-relative/timestamps-relative.component';
import { MatCardModule }                  from "@angular/material/card";
import { MatBadgeModule }                from "@angular/material/badge";
import { MatTooltipModule }               from "@angular/material/tooltip";
import { CleanCardModule } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.module";
import { LabelValueShowcaseModule } from "src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module";
import { EntityStatGridComponent } from "./entity-stat-grid/entity-stat-grid.component";
import { EntityStatCardComponent } from "./entity-stat-card/entity-stat-card.component";


@NgModule({
  declarations: [
    TimestampsRelativeComponent,
    EntityAuthorComponent,
    PatchConnectionSymbolComponent,
    EntityStatGridComponent,
    EntityStatCardComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    RouterModule,
    TimeagoModule.forChild(),
    MatCardModule,
    MatBadgeModule,
    HeroInfoBoxModule,
    MatIconModule,
    MatTooltipModule,
    CleanCardModule,
    LabelValueShowcaseModule
  ],
  exports:      [
    TimestampsRelativeComponent,
    EntityAuthorComponent,
    PatchConnectionSymbolComponent,
    EntityStatGridComponent,
    EntityStatCardComponent
  ]
})
export class SharedAtomsModule {}

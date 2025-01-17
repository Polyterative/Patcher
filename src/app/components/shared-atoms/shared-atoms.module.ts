import { CommonModule }                   from '@angular/common';
import { NgModule }                       from '@angular/core';
import { FlexLayoutModule }               from '@angular/flex-layout';
import { MatIconModule }                  from '@angular/material/icon';
import { TimeagoModule }                  from 'ngx-timeago';
import { HeroInfoBoxModule }              from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { EntityAuthorComponent }          from './entity-author/entity-author.component';
import { PatchConnectionSymbolComponent } from './patch-connection-symbol/patch-connection-symbol.component';
import { TimestampsRelativeComponent }    from './timestamps-relative/timestamps-relative.component';
import { MatCardModule }                  from "@angular/material/card";
import { MatTooltipModule }               from "@angular/material/tooltip";


@NgModule({
  declarations: [
    TimestampsRelativeComponent,
    EntityAuthorComponent,
    PatchConnectionSymbolComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    TimeagoModule.forChild(),
    MatCardModule,
    HeroInfoBoxModule,
    MatIconModule,
    MatTooltipModule
  ],
  exports:      [
    TimestampsRelativeComponent,
    EntityAuthorComponent,
    PatchConnectionSymbolComponent
  ]
})
export class SharedAtomsModule {}
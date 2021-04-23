import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { FlexLayoutModule }            from '@angular/flex-layout';
import { MatCardModule }               from '@angular/material/card';
import { TimeagoModule }               from 'ngx-timeago';
import { HeroInfoBoxModule }           from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { EntityAuthorComponent }       from './entity-author/entity-author.component';
import { TimestampsRelativeComponent } from './timestamps-relative/timestamps-relative.component';


@NgModule({
  declarations: [
    TimestampsRelativeComponent,
    EntityAuthorComponent
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    TimeagoModule.forChild(),
    MatCardModule,
    HeroInfoBoxModule
  ],
  exports:      [
    TimestampsRelativeComponent,
    EntityAuthorComponent
  ]
})
export class SharedAtomsModule {}

import { NgModule }             from '@angular/core';
import { FlexLayoutModule }     from '@angular/flex-layout';
import { MatDividerModule }     from '@angular/material/divider';
import { MatListModule }        from '@angular/material/list';
import { FlexColumnComponent }  from './flex/flex-column/flex-column.component';
import { FlexRowWrapComponent } from './flex/flex-row-wrap/flex-row-wrap.component';
import { FlexRowComponent }     from './flex/flex-row/flex-row.component';
import { SpacerComponent }      from './spacer/spacer.component';

@NgModule({
  imports:      [
    MatListModule,
    MatDividerModule,
    FlexLayoutModule
  ],
  declarations: [
    SpacerComponent,
    FlexRowComponent,
    FlexColumnComponent,
    FlexRowWrapComponent
  ],
  exports:      [
    SpacerComponent,
    FlexRowComponent,
    FlexColumnComponent,
    FlexRowWrapComponent
  ]
})
export class OrangeStructuresModule {
}

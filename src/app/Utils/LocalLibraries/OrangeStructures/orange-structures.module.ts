import { NgModule }            from '@angular/core';
import { FlexLayoutModule }    from '@angular/flex-layout';
import {
  MatDividerModule,
  MatListModule
}                              from '@angular/material';
import { FlexColumnComponent } from './flex-column/flex-column.component';
import { FlexRowComponent }    from './flex-row/flex-row.component';
import { SpacerComponent }     from './spacer/spacer.component';

@NgModule({
  imports:      [
    MatListModule,
    MatDividerModule,
    FlexLayoutModule
  ],
  declarations: [
    SpacerComponent,
    FlexRowComponent,
    FlexColumnComponent
  ],
  exports:      [
    SpacerComponent,
    FlexRowComponent,
    FlexColumnComponent
  ]
})
export class OrangeStructuresModule {
}

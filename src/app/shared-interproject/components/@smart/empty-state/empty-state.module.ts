import { CommonModule }        from '@angular/common';
import { NgModule }            from '@angular/core';
import { FlexLayoutModule }    from '@angular/flex-layout';
import { EmptyStateComponent } from './empty-state.component';

@NgModule({
  declarations: [EmptyStateComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
  ],
  exports:      [EmptyStateComponent]
})
export class EmptyStateModule {}

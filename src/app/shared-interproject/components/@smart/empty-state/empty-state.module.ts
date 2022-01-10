import { CommonModule }          from '@angular/common';
import { NgModule }              from '@angular/core';
import { FlexLayoutModule }      from '@angular/flex-layout';
import { LottieContainerModule } from '../lottie-container/lottie-container.module';
import { EmptyStateComponent }   from './empty-state.component';

@NgModule({
  declarations: [EmptyStateComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    LottieContainerModule
  ],
  exports:      [EmptyStateComponent]
})
export class EmptyStateModule {}

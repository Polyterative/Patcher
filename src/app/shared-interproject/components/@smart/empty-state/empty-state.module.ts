import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { LottieContainerModule } from '../lottie-container/lottie-container.module';
import { EmptyStateComponent } from './empty-state.component';


@NgModule({
  declarations: [EmptyStateComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    MatIconModule,
    LottieContainerModule
  ],
  exports:      [EmptyStateComponent]
})
export class EmptyStateModule {}
import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import { CardWrapperComponent } from 'src/app/Utils/Components/card-wrapper/card-wrapper.component';

@NgModule({
  declarations: [CardWrapperComponent],
  exports:      [CardWrapperComponent],
  imports:      [
    CommonModule
  ]
})
export class CardWrapperModule {
}

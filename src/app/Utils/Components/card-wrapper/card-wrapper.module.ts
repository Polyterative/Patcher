import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexModule }             from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatExpansionModule
}                                 from '@angular/material';
import { CardWrapperComponent }   from 'src/app/Utils/Components/card-wrapper/card-wrapper.component';
import { OrangeStructuresModule } from '../../LocalLibraries/OrangeStructures/orange-structures.module';

@NgModule({
  declarations: [CardWrapperComponent],
  exports:      [CardWrapperComponent],
  imports:      [
    CommonModule,
    MatExpansionModule,
    MatCardModule,
    FlexModule,
    OrangeStructuresModule,
    MatButtonModule
  ]
})
export class CardWrapperModule {
}

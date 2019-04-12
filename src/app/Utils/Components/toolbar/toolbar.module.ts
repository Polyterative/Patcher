import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import {
  MatIconModule,
  MatToolbarModule
}                                 from '@angular/material';
import { ToolbarComponent }       from 'src/app/Utils/Components/toolbar/toolbar.component';
import { OrangeStructuresModule } from 'src/app/Utils/LocalLibraries/OrangeStructures/orange-structures.module';

@NgModule({
  declarations: [ToolbarComponent],
  exports:      [ToolbarComponent],
  imports:      [
    CommonModule,
    // MaterialModulePack,
    OrangeStructuresModule,
    MatToolbarModule,
    MatIconModule
  ]
})
export class ToolbarModule {
}

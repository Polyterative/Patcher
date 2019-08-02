import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexModule }             from '@angular/flex-layout';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatToolbarModule }       from '@angular/material/toolbar';
import { OrangeStructuresModule } from '../../LocalLibraries/OrangeStructures/orange-structures.module';
import { ToolbarComponent }       from './toolbar.component';

@NgModule({
  declarations: [ToolbarComponent],
  exports:      [ToolbarComponent],
  imports:      [
    CommonModule,
    // MaterialModulePack,
    OrangeStructuresModule,
    FlexModule,
    OrangeStructuresModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ToolbarModule {
}

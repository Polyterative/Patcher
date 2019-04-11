import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { MaterialModulePack }     from 'src/app/material/material-module-pack.module';
import { CardWrapperComponent }   from 'src/app/Utils/Components/card-wrapper/card-wrapper.component';
import { ToolbarComponent }       from 'src/app/Utils/Components/toolbar/toolbar.component';
import { OrangeStructuresModule } from 'src/app/Utils/LocalLibraries/OrangeStructures/orange-structures.module';

@NgModule({
  declarations: [
    CardWrapperComponent,
    ToolbarComponent
  ],
  exports:      [
    CardWrapperComponent,
    ToolbarComponent
  ],
  imports:      [
    CommonModule,
    MaterialModulePack,
    OrangeStructuresModule
  ]
})
export class PolyUtilsComponentsModule {
}

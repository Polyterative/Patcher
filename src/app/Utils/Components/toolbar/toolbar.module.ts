import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { NgxsModule }             from '@ngxs/store';
import { MaterialModulePack }     from 'src/app/material/material-module-pack.module';
import { ToolbarComponent }       from 'src/app/Utils/Components/toolbar/toolbar.component';
import { ToolbarState }           from 'src/app/Utils/Components/toolbar/toolbar.state';
import { OrangeStructuresModule } from 'src/app/Utils/LocalLibraries/OrangeStructures/orange-structures.module';

@NgModule({
  declarations: [ToolbarComponent],
  exports:      [ToolbarComponent],
  imports:      [
    CommonModule,
    MaterialModulePack,
    OrangeStructuresModule,
    NgxsModule.forFeature([ToolbarState])
  ]
})
export class ToolbarModule {
}

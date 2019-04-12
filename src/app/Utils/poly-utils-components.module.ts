import { CommonModule }      from '@angular/common';
import { NgModule }          from '@angular/core';
import { CardWrapperModule } from 'src/app/Utils/Components/card-wrapper/card-wrapper.module';
import { ToolbarModule }     from 'src/app/Utils/Components/toolbar/toolbar.module';

@NgModule({
  imports: [
    CommonModule,
    ToolbarModule,
    CardWrapperModule
  ],
  exports: [
    ToolbarModule,
    CardWrapperModule
  ]
})
export class PolyUtilsComponentsModule {
}

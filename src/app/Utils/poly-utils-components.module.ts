import { CommonModule }      from '@angular/common';
import { NgModule }          from '@angular/core';
import { CardWrapperModule } from './Components/card-wrapper/card-wrapper.module';
import { ToolbarModule }     from './Components/toolbar/toolbar.module';

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

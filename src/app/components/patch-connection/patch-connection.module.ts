import { CommonModule }                    from '@angular/common';
import { NgModule }                        from '@angular/core';
import { FlexLayoutModule }                from '@angular/flex-layout';
import { MatChipsModule }                  from '@angular/material/chips';
import { ModulePartsModule }               from 'src/app/components/module-parts/module-parts.module';
import { PatchConnectionMinimalComponent } from './patch-connection-minimal/patch-connection-minimal.component';


@NgModule({
  declarations: [
    PatchConnectionMinimalComponent
  ],
  providers:    [PatchConnectionModule],
  imports:      [
    CommonModule,
    MatChipsModule,
    ModulePartsModule,
    FlexLayoutModule
  ],
  exports:      [
    PatchConnectionMinimalComponent
  ]
})
export class PatchConnectionModule {}

import { CommonModule }                    from '@angular/common';
import { NgModule }                        from '@angular/core';
import { FlexLayoutModule }                from '@angular/flex-layout';
import { MatButtonModule }                 from '@angular/material/button';
import { MatChipsModule }                  from '@angular/material/chips';
import { MatIconModule }                   from '@angular/material/icon';
import { MatTooltipModule }                from '@angular/material/tooltip';
import { ModulePartsModule }               from 'src/app/components/module-parts/module-parts.module';
import { SharedAtomsModule }               from 'src/app/components/shared-atoms/shared-atoms.module';
import { BrandPrimaryButtonModule }        from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
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
    FlexLayoutModule,
    SharedAtomsModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    BrandPrimaryButtonModule
  ],
  exports:      [
    PatchConnectionMinimalComponent
  ]
})
export class PatchConnectionModule {}
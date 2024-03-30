import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroInfoBoxModule } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { PatchConnectionMinimalComponent } from './patch-connection-minimal/patch-connection-minimal.component';
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatCardModule } from "@angular/material/card";


@NgModule({
  declarations: [
    PatchConnectionMinimalComponent
  ],
  providers:    [PatchConnectionModule],
  imports: [
    CommonModule,
    
    MatChipsModule,
    ModulePartsModule,
    FlexLayoutModule,
    SharedAtomsModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    BrandPrimaryButtonModule,
    MatDividerModule,
    HeroInfoBoxModule,
    MatFormEntityModule,
    MatCardModule
  ],
  exports:      [
    PatchConnectionMinimalComponent
  ]
})
export class PatchConnectionModule {}
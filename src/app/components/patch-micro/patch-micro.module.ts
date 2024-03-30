import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HeroClickableTitleModule } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { HeroInfoBoxModule } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { PatchMicroComponent } from './patch-micro.component';
import { MatCardModule } from "@angular/material/card";


@NgModule({
  declarations: [PatchMicroComponent],
  exports:      [PatchMicroComponent],
  imports:      [
    CommonModule,
    HeroClickableTitleModule,
    MatCardModule,
    SharedAtomsModule,
    HeroInfoBoxModule
  ]
})
export class PatchMicroModule {}
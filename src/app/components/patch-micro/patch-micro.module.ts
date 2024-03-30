import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { HeroClickableTitleModule } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { HeroInfoBoxModule } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { PatchMicroComponent } from './patch-micro.component';


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
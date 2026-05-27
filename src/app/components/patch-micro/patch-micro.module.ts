import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HeroClickableTitleComponent } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { HeroInfoBoxComponent } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { PatchMicroComponent } from './patch-micro.component';
import { MatCardModule } from "@angular/material/card";


@NgModule({
  declarations: [PatchMicroComponent],
  exports:      [PatchMicroComponent],
  imports:      [
    CommonModule,
    HeroClickableTitleComponent,
    MatCardModule,
    SharedAtomsModule,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective
  ]
})
export class PatchMicroModule {}
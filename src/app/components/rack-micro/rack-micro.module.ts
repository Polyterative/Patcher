import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { HeroClickableTitleModule } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { RackMicroComponent } from './rack-micro.component';
import { MatCardModule } from "@angular/material/card";
import { RackImageComponent } from "src/app/components/rack-parts/rack-image/rack-image.component";


@NgModule({
  declarations: [RackMicroComponent],
  exports:      [RackMicroComponent],
  imports: [
    CommonModule,
    HeroClickableTitleModule,
    SharedAtomsModule,
    MatCardModule,
    FlexLayoutModule,
    RackImageComponent
  ]
})
export class RackMicroModule {}
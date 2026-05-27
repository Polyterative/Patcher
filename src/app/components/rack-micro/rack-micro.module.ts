import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { HeroClickableTitleComponent } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { SharedAtomsModule } from '../shared-atoms/shared-atoms.module';
import { RackMicroComponent } from './rack-micro.component';
import { MatCardModule } from "@angular/material/card";
import { RackImageComponent } from "src/app/components/rack-parts/rack-image/rack-image.component";


@NgModule({
  declarations: [RackMicroComponent],
  exports:      [RackMicroComponent],
  imports: [
    CommonModule,
    HeroClickableTitleComponent,
    SharedAtomsModule,
    MatCardModule,
    FlexLayoutModule,
    RackImageComponent
  ]
})
export class RackMicroModule {}
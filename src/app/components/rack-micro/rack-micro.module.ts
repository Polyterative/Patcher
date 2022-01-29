import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { MatCardModule }            from '@angular/material/card';
import { HeroClickableTitleModule } from '../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.module';
import { SharedAtomsModule }        from '../shared-atoms/shared-atoms.module';
import { RackMicroComponent }       from './rack-micro.component';

@NgModule({
  declarations: [RackMicroComponent],
  exports:      [RackMicroComponent],
  imports:      [
    CommonModule,
    HeroClickableTitleModule,
    SharedAtomsModule,
    MatCardModule
  ]
})
export class RackMicroModule {}

import { CommonModule }        from '@angular/common';
import { NgModule }            from '@angular/core';
import { FlexLayoutModule }    from '@angular/flex-layout';
import { HeroHeaderComponent } from './hero-header/hero-header.component';


@NgModule({
  declarations: [
    HeroHeaderComponent
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ],
  exports:      [
    HeroHeaderComponent
  ]
})
export class HeroHeaderModule {}

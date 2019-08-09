import { CommonModule }      from '@angular/common';
import { NgModule }          from '@angular/core';
import { WordSwapperModule } from '../word-swapper/word-swapper.module';
import { AboutMeComponent }  from './about-me.component';


@NgModule({
  declarations: [AboutMeComponent],
  imports:      [
    CommonModule,
    WordSwapperModule
  ],
  exports:      [AboutMeComponent]
})
export class AboutMeModule {}

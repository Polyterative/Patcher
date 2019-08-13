import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { InstagramRouterComponent } from './instagram-router.component';


@NgModule({
  declarations: [InstagramRouterComponent],
  imports:      [
    CommonModule
  ],
  exports:      [InstagramRouterComponent]
})
export class InstagramRouterModule {}

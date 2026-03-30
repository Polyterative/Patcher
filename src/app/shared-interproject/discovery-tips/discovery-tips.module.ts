import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DiscoveryTipAnchorDirective } from './discovery-tip-anchor.directive';


@NgModule({
  declarations: [
    DiscoveryTipAnchorDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DiscoveryTipAnchorDirective
  ]
})
export class DiscoveryTipsModule {}

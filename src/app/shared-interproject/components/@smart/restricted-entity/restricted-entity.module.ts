import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RestrictedEntityComponent } from './restricted-entity/restricted-entity.component';
import { RestrictedLoggedDirective } from './restricted-logged.directive';
import { MatTooltipModule } from "@angular/material/tooltip";


@NgModule({
  declarations: [
    RestrictedEntityComponent,
    RestrictedLoggedDirective
  ],
  imports:      [
    CommonModule,
    MatTooltipModule,
    FlexLayoutModule
  ],
  exports:      [
    RestrictedEntityComponent
  ]
})
export class RestrictedEntityModule {}
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { RestrictedEntityComponent } from './restricted-entity/restricted-entity.component';
import { RestrictedLoggedDirective } from './restricted-logged.directive';


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
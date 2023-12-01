import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RackListModule } from '../rack-list/rack-list.module';
import { ModuleRacksComponent } from './module-racks.component';

@NgModule({
  declarations: [
    ModuleRacksComponent
  ],
  imports:      [
    CommonModule,
    RackListModule
  ],
  exports:      [
    ModuleRacksComponent
  ]
})
export class ModuleRacksModule {}

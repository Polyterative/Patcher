import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { MatIconModule }               from '@angular/material/icon';
import { MatListModule }               from '@angular/material/list';
import { MatMenuModule }               from '@angular/material/menu';
import { GeneralContextMenuComponent } from './general-context-menu.component';


@NgModule({
  declarations: [
    GeneralContextMenuComponent
  ],
  imports:      [
    CommonModule,
    MatListModule,
    MatMenuModule,
    MatIconModule
  ],
  exports:      [
    GeneralContextMenuComponent
  ]
})
export class GeneralContextMenuModule {}

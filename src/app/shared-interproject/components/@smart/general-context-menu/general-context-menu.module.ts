import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
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
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EditFabComponent } from './edit-fab.component';


@NgModule({
  declarations: [EditFabComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
  exports: [EditFabComponent]
})
export class EditFabModule {}
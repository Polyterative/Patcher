import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { NgPipesModule } from 'ngx-pipes';
import { FileDragHostComponent } from './file-drag-host.component';
import { MatCardModule } from "@angular/material/card";


@NgModule({
  declarations: [FileDragHostComponent],
  imports:      [
    CommonModule,
    NgxDropzoneModule,
    FlexLayoutModule,
    NgPipesModule,
    MatCardModule
  ],
  exports:      [FileDragHostComponent]
})
export class FileDragHostModule {}
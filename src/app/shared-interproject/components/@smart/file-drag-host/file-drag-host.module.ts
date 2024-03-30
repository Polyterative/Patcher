import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { NgPipesModule } from 'ngx-pipes';
import { FileDragHostComponent } from './file-drag-host.component';


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
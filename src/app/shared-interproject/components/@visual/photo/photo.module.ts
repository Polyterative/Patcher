import { CommonModule }     from '@angular/common';
import { NgModule }         from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule }    from '@angular/material/card';
// import { SmartPictureModule } from 'smart-picture';
import { PhotoComponent }   from 'src/app/shared-interproject/components/@visual/photo/photo.component';
import { PhotosService }    from 'src/app/shared-interproject/components/@visual/photo/photos.service';


@NgModule({
  declarations: [
    PhotoComponent
  ],
  providers:    [PhotosService],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    MatCardModule,
    // SmartPictureModule
  ],
  exports:      [
    PhotoComponent
  ]
})
export class PhotoModule {}

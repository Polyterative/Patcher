import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DeviceFrameWrapperComponent } from './device-frame-wrapper.component';

@NgModule({
  declarations: [
    DeviceFrameWrapperComponent
  ],
  imports:      [
    CommonModule,
    FlexLayoutModule
  ],
  exports:      [
    DeviceFrameWrapperComponent
  ]
})
export class DeviceFrameWrapperModule {}

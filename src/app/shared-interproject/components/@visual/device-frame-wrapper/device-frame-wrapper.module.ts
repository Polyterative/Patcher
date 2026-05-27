import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DeviceFrameWrapperComponent } from './device-frame-wrapper.component';

@NgModule({
  declarations: [
    DeviceFrameWrapperComponent
  ],
  imports:      [
    CommonModule
  ],
  exports:      [
    DeviceFrameWrapperComponent
  ]
})
export class DeviceFrameWrapperModule {}

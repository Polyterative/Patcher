import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { FeedbackBoxComponent } from './feedback-box.component';


@NgModule({
  declarations: [
    FeedbackBoxComponent
  ],
  imports:      [
    CommonModule,
    ScreenWrapperModule,
    MatCardModule,
    FlexLayoutModule,
    LabelValueShowcaseModule
  ],
  exports:      [
    FeedbackBoxComponent
  ]
})
export class FeedbackBoxModule { }
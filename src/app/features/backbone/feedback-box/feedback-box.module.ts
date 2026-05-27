import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { FeedbackBoxComponent } from './feedback-box.component';


@NgModule({
  declarations: [
    FeedbackBoxComponent
  ],
  imports:      [
    CommonModule,
    ScreenWrapperComponent,
    MatCardModule,
    FlexLayoutModule,
    LabelValueShowcaseComponent
  ],
  exports:      [
    FeedbackBoxComponent
  ]
})
export class FeedbackBoxModule { }
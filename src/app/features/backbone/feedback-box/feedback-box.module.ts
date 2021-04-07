import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import { FlexLayoutModule }     from '@angular/flex-layout';
import { MatCardModule }        from '@angular/material/card';
import { ScreenWrapperModule }  from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { FeedbackBoxComponent } from './feedback-box.component';


@NgModule({
  declarations: [
    FeedbackBoxComponent
  ],
    imports: [
        CommonModule,
        ScreenWrapperModule,
        MatCardModule,
        FlexLayoutModule
    ],
  exports: [
    FeedbackBoxComponent
  ]
})
export class FeedbackBoxModule { }

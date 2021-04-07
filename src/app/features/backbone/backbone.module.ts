import { NgModule }          from '@angular/core';
import { FeedbackBoxModule } from './feedback-box/feedback-box.module';
import { HomeModule }        from './home/home.module';
import { ToolbarModule }     from './toolbar/toolbar.module';

@NgModule({
    declarations: [],
    imports:      [
        HomeModule,
        ToolbarModule,
        FeedbackBoxModule
    ]
})
export class BackboneModule {}

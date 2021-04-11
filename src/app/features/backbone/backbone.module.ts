import { NgModule }          from '@angular/core';
import { AppStateService }   from '../../shared-interproject/app-state.service';
import { FeedbackBoxModule } from './feedback-box/feedback-box.module';
import { HomeModule }        from './home/home.module';
import { ToolbarModule }     from './toolbar/toolbar.module';

@NgModule({
    providers: [AppStateService],
    imports:   [
        HomeModule,
        ToolbarModule,
        FeedbackBoxModule
    ]
})
export class BackboneModule {}
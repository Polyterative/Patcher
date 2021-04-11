import { NgModule }          from '@angular/core';
import { AppStateService }   from '../../shared-interproject/app-state.service';
import { NotFoundModule }    from './404/not-found.module';
import { FeedbackBoxModule } from './feedback-box/feedback-box.module';
import { HomeModule }        from './home/home.module';
import { ToolbarModule }     from './toolbar/toolbar.module';

@NgModule({
    providers: [AppStateService],
    imports: [
        HomeModule,
        ToolbarModule,
        FeedbackBoxModule,
        NotFoundModule //keep as last (for routes)
    ]
})
export class BackboneModule {}
import { HttpClientModule }       from '@angular/common/http';
import { NgModule }               from '@angular/core';
import { AppStateService }        from '../../shared-interproject/app-state.service';
import { UserDataHandlerService } from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { NotFoundModule }         from './404/not-found.module';
import { CommonSidebarComponent } from './common-sidebar/common-sidebar.component';
import { FeedbackBoxModule }      from './feedback-box/feedback-box.module';
import { HomeModule }             from './home/home.module';
import { ToolbarModule }          from './toolbar/toolbar.module';

@NgModule({
    providers:    [
        AppStateService,
        UserDataHandlerService
    ],
    imports:      [
        HttpClientModule,
        HomeModule,
        ToolbarModule,
        FeedbackBoxModule,
        NotFoundModule //keep as last (for routes)
    ],
    declarations: [
        CommonSidebarComponent
    ],
    exports:      [
        CommonSidebarComponent
    ]
})
export class BackboneModule {}
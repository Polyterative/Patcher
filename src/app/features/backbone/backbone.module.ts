import { CommonModule }           from '@angular/common';
import { HttpClientModule }       from '@angular/common/http';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material/card';
import { AppStateService }        from '../../shared-interproject/app-state.service';
import { DevOnlyWindowModule }    from '../../shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { UserDataHandlerService } from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { HeroInfoBoxModule }      from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { HeroInfoBoxService }     from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.service';
import { BuildInfoComponent }     from './build-info/build-info.component';
import { CommonSidebarComponent } from './common-sidebar/common-sidebar.component';
import { DiscordWidgetComponent } from './discord-widget/discord-widget.component';
import { FeedbackBoxModule }      from './feedback-box/feedback-box.module';
import { FooterComponent }        from './footer/footer.component';
import { HomeModule }             from './home/home.module';
import { LoginModule }            from './login/login.module';
import { ToolbarModule }          from './toolbar/toolbar.module';

@NgModule({
  providers:    [
    AppStateService,
    UserDataHandlerService,
    HeroInfoBoxService
  ],
  imports:      [
    HttpClientModule,
    HomeModule,
    ToolbarModule,
    FeedbackBoxModule,
    FlexLayoutModule,
    LoginModule,
    HeroInfoBoxModule,
    MatCardModule,
    DevOnlyWindowModule,
    CommonModule
    // NotFoundModule//keep as last (for routes)
  ],
  declarations: [
    CommonSidebarComponent,
    FooterComponent,
    BuildInfoComponent,
    DiscordWidgetComponent
  ],
  exports:      [
    CommonSidebarComponent,
    FooterComponent,
    BuildInfoComponent,
    DiscordWidgetComponent
  ]
})
export class BackboneModule {}

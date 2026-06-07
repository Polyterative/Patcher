import { CommonModule }              from '@angular/common';
import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi
}                                    from '@angular/common/http';
import { NgModule }                  from '@angular/core';
import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatCardModule }             from "@angular/material/card";
import { MatDividerModule }          from '@angular/material/divider';
import { TimeagoModule }             from 'ngx-timeago';
import { AppStateService }           from '../../shared-interproject/app-state.service';
import { DevOnlyWindowComponent }       from '../../shared-interproject/components/@smart/dev-only-window/dev-only-window/dev-only-window.component';
import { LottieContainerModule }     from '../../shared-interproject/components/@smart/lottie-container/lottie-container.module';
import { UserDataHandlerService }    from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { HeroInfoBoxComponent } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { HeroInfoBoxService }        from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.service';
import { LabelValueShowcaseComponent }  from '../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent }       from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { BuildInfoComponent }        from './build-info/build-info.component';
import { CommonSidebarComponent }    from './common-sidebar/common-sidebar.component';
import { DiscordWidgetComponent }    from './discord-widget/discord-widget.component';
import { EventBannerComponent }      from './event-banner/event-banner.component';
import { FeedbackBoxModule }         from './feedback-box/feedback-box.module';
import { FooterComponent }           from './footer/footer.component';
import { ProducthuntBadgeComponent } from './footer/producthunt-badge/producthunt-badge.component';
import { LegacyLinkGoneModule }      from './legacy-link-gone/legacy-link-gone.module';
import { NotFoundModule }            from './404/not-found.module';
import { ToolbarModule }             from './toolbar/toolbar.module';


@NgModule({
  declarations: [
    CommonSidebarComponent,
    FooterComponent,
    BuildInfoComponent,
    DiscordWidgetComponent,
    ProducthuntBadgeComponent,
    EventBannerComponent,
  ],
  exports:      [
    CommonSidebarComponent,
    FooterComponent,
    BuildInfoComponent,
    DiscordWidgetComponent,
    ProducthuntBadgeComponent,
    EventBannerComponent,
  ], imports:   [
  ToolbarModule,
  FeedbackBoxModule,
  HeroInfoBoxComponent,    HeroInfoBoxTextDirective,
    MatCardModule,
    DevOnlyWindowComponent,
    CommonModule,
    TimeagoModule,
    LabelValueShowcaseComponent,
    MatDividerModule,
    ScreenWrapperComponent,
    LottieContainerModule,
    MatButtonModule,
    MatIconModule,
    LegacyLinkGoneModule,
    NotFoundModule//keep as last (for routes)
  ], providers: [
    AppStateService,
    UserDataHandlerService,
    HeroInfoBoxService,
    provideHttpClient(withFetch(), withInterceptorsFromDi())
  ]
})
export class BackboneModule {}
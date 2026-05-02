import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { PatchBrowserModule } from 'src/app/features/patch-browser/patch-browser.module';
import { RackBrowserModule } from 'src/app/features/routes/rack/rack-browser.module';
import { StatisticsModule } from 'src/app/components/shared-atoms/statistics/statistics.module';
import { UserDataHandlerModule } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { DeviceFrameWrapperModule } from 'src/app/shared-interproject/components/@visual/device-frame-wrapper/device-frame-wrapper.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { HomeCuriosityBridgeComponent } from './components/home-curiosity-bridge/home-curiosity-bridge.component';
import { HomeExperienceHeroComponent } from './components/home-experience-hero/home-experience-hero.component';
import { HomeFounderNoteComponent } from './components/home-founder-note/home-founder-note.component';
import { HomeInvitationCtaComponent } from './components/home-invitation-cta/home-invitation-cta.component';
import { HomeOpenPrinciplesComponent } from './components/home-open-principles/home-open-principles.component';
import { HomeProofShowcaseComponent } from './components/home-proof-showcase/home-proof-showcase.component';
import { HomeWorkflowRailComponent } from './components/home-workflow-rail/home-workflow-rail.component';
import { HomeComponent } from './home.component';


@NgModule({
  declarations: [
    HomeComponent,
    HomeExperienceHeroComponent,
    HomeOpenPrinciplesComponent,
    HomeWorkflowRailComponent,
    HomeProofShowcaseComponent,
    HomeCuriosityBridgeComponent,
    HomeFounderNoteComponent,
    HomeInvitationCtaComponent,
  ],
  exports: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule.forRoot([
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'home',
        component: HomeComponent
      }
    ], {scrollPositionRestoration: 'enabled'}),
    UserDataHandlerModule,
    ScreenWrapperModule,
    BrandPrimaryButtonModule,
    ModuleBrowserModule,
    PatchModule,
    DeviceFrameWrapperModule,
    RackBrowserModule,
    PatchBrowserModule,
    StatisticsModule,
  ]
})
export class HomeModule {}

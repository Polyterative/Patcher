import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule, FlexModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { LottieContainerModule } from 'src/app/shared-interproject/components/@smart/lottie-container/lottie-container.module';
import { RouteClickableLinkModule } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.module';
import { BrandLogoModule } from 'src/app/shared-interproject/components/@visual/brand-logo/brand-logo.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ToolbarComponent } from './toolbar.component';
import { ToolbarService } from './toolbar.service';

@NgModule({
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    FlexModule,
    MatMenuModule,
    FlexLayoutModule,
    MatToolbarModule,
    BrandLogoModule,
    RouterModule,
    ScreenWrapperModule,
    RouteClickableLinkModule,
    MatCardModule,
    MatDividerModule,
    LottieContainerModule
  ],
  declarations: [
    ToolbarComponent
  ],
  exports:      [
    ToolbarComponent
  ],
  providers:    [
    ToolbarService
  ]
})
export class ToolbarModule {}

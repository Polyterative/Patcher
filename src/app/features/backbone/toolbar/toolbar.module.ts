import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  FlexLayoutModule,
  FlexModule
} from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { RouteClickableLinkModule } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.module';
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
    RouterModule,
    ScreenWrapperModule,
    RouteClickableLinkModule,
    MatDividerModule
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
import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import {
    FlexLayoutModule,
    FlexModule
}                                   from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatMenuModule }            from '@angular/material/menu';
import { MatToolbarModule }         from '@angular/material/toolbar';
import { RouterModule }             from '@angular/router';
import { RouteClickableLinkModule } from '../../../shared-interproject/components/@smart/route-clickable-link/route-clickable-link.module';
import { BrandLogoModule }          from '../../../shared-interproject/components/@visual/brand-logo/brand-logo.module';
import { ScreenWrapperModule }      from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ToolbarComponent }         from './toolbar.component';
import { ToolbarService }           from './toolbar.service';

@NgModule({
    imports:      [
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
        RouteClickableLinkModule
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
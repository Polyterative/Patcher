import { CommonModule }                from '@angular/common';
import { NgModule }                    from '@angular/core';
import { FlexLayoutModule }            from '@angular/flex-layout';
import { MatButtonModule }             from '@angular/material/button';
import { MatIconModule }               from '@angular/material/icon';
import { MatListModule }               from '@angular/material/list';
import { MatMenuModule }               from '@angular/material/menu';
import { RouterModule }                from '@angular/router';
import { RouteClickableLinkComponent } from './route-clickable-link/route-clickable-link.component';


@NgModule({
    declarations: [
        RouteClickableLinkComponent
    ],
    imports:      [
        CommonModule,
        MatIconModule,
        MatMenuModule,
        RouterModule,
        FlexLayoutModule,
        MatListModule,
        MatButtonModule
    ],
    exports:      [
        RouteClickableLinkComponent
    ]
})
export class RouteClickableLinkModule {}
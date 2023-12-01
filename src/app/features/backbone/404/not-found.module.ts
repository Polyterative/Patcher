import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { NotFoundComponent } from './not-found.component';

@NgModule({
    declarations: [
        NotFoundComponent
    ],
    imports:      [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      '404',
                component: NotFoundComponent
            },
            {
                path:       '**',//keep as last (for routes)
                redirectTo: '/404'
            }
        ], {scrollPositionRestoration: 'enabled'}),
        EmptyStateModule,
        FlexLayoutModule,
        MatCardModule
    ],
    exports:      [
        NotFoundComponent
    ]
})
export class NotFoundModule {}

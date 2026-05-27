import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
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
        EmptyStateComponent,
        MatCardModule
    ],
    exports:      [
        NotFoundComponent
    ]
})
export class NotFoundModule {}

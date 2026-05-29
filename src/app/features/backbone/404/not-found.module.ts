import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { NotFoundComponent } from './not-found.component';

@NgModule({
    declarations: [
        NotFoundComponent
    ],
    imports:      [
        CommonModule,
        EmptyStateComponent,
        MatCardModule
    ],
    exports:      [
        NotFoundComponent
    ]
})
export class NotFoundModule {}

import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexModule }             from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { CardWrapperComponent }   from 'src/app/Utils/Components/card-wrapper/card-wrapper.component';
import { OrangeStructuresModule } from '../../LocalLibraries/OrangeStructures/orange-structures.module';

@NgModule({
    declarations: [CardWrapperComponent],
    exports:      [CardWrapperComponent],
    imports:      [
        CommonModule,
        MatExpansionModule,
        MatCardModule,
        FlexModule,
        OrangeStructuresModule,
        MatButtonModule
    ]
})
export class CardWrapperModule {
}

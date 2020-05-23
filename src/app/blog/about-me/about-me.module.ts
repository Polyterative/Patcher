import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material/card';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { FlatBoxModule }          from '../flat-box/flat-box.module';
import { PageRetrieverModule }    from '../page-retriever/page-retriever.module';
import { WordSwapperModule }      from '../word-swapper/word-swapper.module';
import { AboutMeComponent }       from './about-me.component';

@NgModule({
    declarations: [AboutMeComponent],
    imports:      [
        CommonModule,
        WordSwapperModule,
        MatCardModule,
        FlatBoxModule,
        OrangeStructuresModule,
        FlexLayoutModule,
        PageRetrieverModule
    ],
    exports:      [AboutMeComponent]
})
export class AboutMeModule {}

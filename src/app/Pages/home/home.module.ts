import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import {
    MatButtonModule,
    MatCardModule
}                                  from '@angular/material';
import { BlogPostStructureModule } from '../../blog/blog-post-structure/blog-post-structure.module';
import { PageRetrieverModule }     from '../../blog/page-retriever/page-retriever.module';
import { WordSwapperModule }       from '../../blog/word-swapper/word-swapper.module';
import { OrangeStructuresModule }  from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { HomeComponent }           from './home.component';

@NgModule({
    declarations: [HomeComponent],
    imports:      [
        CommonModule,
        OrangeStructuresModule,
        FlexLayoutModule,
        MatCardModule,
        BlogPostStructureModule,
        PageRetrieverModule,
        WordSwapperModule,
        MatButtonModule
    ],
    exports:      [HomeComponent]
})
export class HomeModule {}

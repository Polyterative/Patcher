import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatProgressBarModule }    from '@angular/material';
import { OrangeStructuresModule }  from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostStructureModule } from '../blog-post-structure/blog-post-structure.module';
import { PageRetrieverComponent }  from './page-retriever.component';


@NgModule({
    declarations: [PageRetrieverComponent],
    imports:      [
        CommonModule,
        MatProgressBarModule,
        BlogPostStructureModule,
        FlexLayoutModule,
        OrangeStructuresModule
    ],
    exports:      [PageRetrieverComponent]
})
export class PageRetrieverModule {}

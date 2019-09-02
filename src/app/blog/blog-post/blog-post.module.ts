import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import {
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule
}                                  from '@angular/material';
import { MarkdownModule }          from 'ngx-markdown';
import { OrangeStructuresModule }  from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostStructureModule } from '../blog-post-structure/blog-post-structure.module';
import { BlogPostComponent }       from './blog-post.component';

@NgModule({
    declarations: [BlogPostComponent],
    imports:      [
        CommonModule,
        // ComponentsModule,
        MarkdownModule.forChild(),
        OrangeStructuresModule,
        MatCardModule,
        FlexLayoutModule,
        MatButtonModule,
        MatProgressBarModule,
        BlogPostStructureModule
    ]
})
export class BlogPostModule {}

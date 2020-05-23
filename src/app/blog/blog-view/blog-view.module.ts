import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MarkdownModule }          from 'ngx-markdown';
import { OrangeStructuresModule }  from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostStructureModule } from '../blog-post-structure/blog-post-structure.module';
import { BlogViewComponent }       from './blog-view.component';

@NgModule({
    declarations: [BlogViewComponent],
    imports:      [
        CommonModule,
        // ComponentsModule,
        MarkdownModule.forChild(),
        OrangeStructuresModule,
        FlexLayoutModule,
        MatCardModule,
        MatButtonModule,
        MatProgressBarModule,
        BlogPostStructureModule
    ]
})
export class BlogViewModule {}

import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { FlexLayoutModule }           from '@angular/flex-layout';
import { MatCardModule }              from '@angular/material';
import { MarkdownModule }             from 'ngx-markdown';
import { OrangeStructuresModule }     from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { CategoryIndicatorModule }    from '../category-indicator/category-indicator.module';
import { ImageContainerModule }       from '../image-container/image-container.module';
import { BlogPostStructureComponent } from './blog-post-structure.component';


@NgModule({
  declarations: [BlogPostStructureComponent],
  imports:      [
    CommonModule,
    MatCardModule,
    OrangeStructuresModule,
    FlexLayoutModule,
    MarkdownModule.forChild(),
    CategoryIndicatorModule,
    ImageContainerModule
  ],
  exports:      [BlogPostStructureComponent]
})
export class BlogPostStructureModule {}

import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { FlexLayoutModule }           from '@angular/flex-layout';
import { MatCardModule }              from '@angular/material';
import { MarkdownModule }             from 'ngx-markdown';
import { OrangeStructuresModule }     from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostStructureComponent } from './blog-post-structure.component';


@NgModule({
  declarations: [BlogPostStructureComponent],
  imports:      [
    CommonModule,
    MatCardModule,
    OrangeStructuresModule,
    FlexLayoutModule,
    MarkdownModule.forChild()
  ],
  exports:      [BlogPostStructureComponent]
})
export class BlogPostStructureModule {}

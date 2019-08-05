import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material';
import { RouterModule }           from '@angular/router';
import { MarkdownModule }         from 'ngx-markdown';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogPostComponent }      from './blog-post.component';

@NgModule({
  declarations: [BlogPostComponent],
  imports: [
    CommonModule,
    // ComponentsModule,
    MarkdownModule.forChild(),
    OrangeStructuresModule,
    MatCardModule,
    FlexLayoutModule
  ]
})
export class BlogPostModule {}

import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatProgressBarModule
}                                 from '@angular/material';
import { MarkdownModule }         from 'ngx-markdown';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogNewPostComponent }   from './blog-new-post.component';

@NgModule({
  declarations: [BlogNewPostComponent],
  exports:      [BlogNewPostComponent],
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
    MatCardModule,
    OrangeStructuresModule,
    MatProgressBarModule,
    MatButtonModule,
    FlexLayoutModule
  ]
})
export class BlogNewPostModule {}

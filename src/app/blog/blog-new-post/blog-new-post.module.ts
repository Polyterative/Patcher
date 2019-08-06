import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import { MarkdownModule }       from 'ngx-markdown';
import { BlogNewPostComponent } from './blog-new-post.component';

@NgModule({
  declarations: [BlogNewPostComponent],
  exports:      [BlogNewPostComponent],
  imports:      [
    CommonModule,
    MarkdownModule.forChild()
  ]
})
export class BlogNewPostModule {}

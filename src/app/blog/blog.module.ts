import { CommonModule }   from '@angular/common';
import { NgModule }       from '@angular/core';
import { RouterModule }   from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      {path: '', pathMatch: 'full', loadChildren: './blog/blog-view.module#BlogViewModule'},
      {path: 'post', loadChildren: './post/blog-post-view.module#BlogPostModule'}
    ]),
    MarkdownModule.forRoot()
  ]
})
export class BlogModule {}

import { CommonModule }      from '@angular/common';
import { NgModule }          from '@angular/core';
import { RouterModule }      from '@angular/router';
import { MarkdownModule }    from 'ngx-markdown';
import { BlogPostComponent } from './blog-post.component';

@NgModule({
  declarations: [BlogPostComponent],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      {path: '', component: BlogPostComponent},
      {path: ':id', component: BlogPostComponent, pathMatch: 'full'}
    ]),
    // ComponentsModule,
    MarkdownModule.forChild()
  ]
})
export class BlogPostModule {}

import { CommonModule }         from '@angular/common';
import {
  HttpClient,
  HttpClientModule
}                               from '@angular/common/http';
import { NgModule }             from '@angular/core';
import { RouterModule }         from '@angular/router';
import { MarkdownModule }       from 'ngx-markdown';
import { BlogNewPostComponent } from './blog-new-post/blog-new-post.component';
import { BlogNewPostModule }    from './blog-new-post/blog-new-post.module';
import { BlogPostComponent }    from './blog-post/blog-post.component';
import { BlogPostModule }       from './blog-post/blog-post.module';
import { BlogViewComponent }    from './blog-view/blog-view.component';
import { BlogViewModule }       from './blog-view/blog-view.module';

@NgModule({
  declarations: [],
  imports:      [
    CommonModule,
    BlogViewModule,
    BlogPostModule,
    BlogNewPostModule,
    RouterModule.forChild([
      {path: 'blog', component: BlogViewComponent, pathMatch: 'full'},
      {path: 'new', component: BlogNewPostComponent, pathMatch: 'full'},
      {path: 'post/:id', component: BlogPostComponent}
    ]),
    HttpClientModule,
    MarkdownModule.forRoot({loader: HttpClient})
  ]
})
export class BlogModule {}

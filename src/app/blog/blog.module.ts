import { CommonModule }   from '@angular/common';
import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';
import { NgModule }       from '@angular/core';
import { RouterModule }   from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { BlogPostModule } from './blog-post/blog-post.module';
import { BlogViewModule } from './blog-view/blog-view.module';

@NgModule({
  declarations: [],
  imports:      [
    CommonModule,
    BlogViewModule,
    BlogPostModule,
    RouterModule.forChild([
      {path: '', pathMatch: 'full', loadChildren: './blog-view/blog-view.module#BlogViewModule'},
      {path: 'post', loadChildren: './blog-post/blog-post-view.module#BlogPostModule'}
    ]),
    HttpClientModule,
    MarkdownModule.forRoot({loader:HttpClient})
  ]
})
export class BlogModule {}

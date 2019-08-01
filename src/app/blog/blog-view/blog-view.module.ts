import { CommonModule }      from '@angular/common';
import { NgModule }          from '@angular/core';
import { RouterModule }      from '@angular/router';
import { MarkdownModule }    from 'ngx-markdown';
import { BlogViewComponent } from './blog-view.component';

@NgModule({
  declarations: [BlogViewComponent],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      {path: '', component: BlogViewComponent}
    ]),
    // ComponentsModule,
    MarkdownModule.forChild()
  ]
})
export class BlogViewModule {}

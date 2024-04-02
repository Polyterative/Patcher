import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
// import { MarkdownModule } from 'ngx-markdown';
import { ChangelogComponent } from './changelog/changelog.component';


@NgModule({
  declarations: [
    ChangelogComponent
  ],
  imports:      [
    CommonModule,
    
    RouterModule.forChild([
      {
        path:      'info/changelog',
        component: ChangelogComponent
      }
    ]),
    // MarkdownModule
  ],
  exports:      [
    ChangelogComponent
  ]
})
export class InfoPagesModule {}
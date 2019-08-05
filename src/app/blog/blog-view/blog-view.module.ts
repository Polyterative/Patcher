import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import { MatCardModule }          from '@angular/material';
import { RouterModule }           from '@angular/router';
import { MarkdownModule }         from 'ngx-markdown';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogViewComponent }      from './blog-view.component';

@NgModule({
  declarations: [BlogViewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {path: '', component: BlogViewComponent}
    ]),
    // ComponentsModule,
    MarkdownModule.forChild(),
    OrangeStructuresModule,
    FlexLayoutModule,
    MatCardModule
  ]
})
export class BlogViewModule {}

import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatProgressBarModule
} from '@angular/material';
import { MarkdownModule }         from 'ngx-markdown';
import { OrangeStructuresModule } from '../../Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { BlogViewComponent }      from './blog-view.component';

@NgModule({
  declarations: [BlogViewComponent],
  imports: [
    CommonModule,
    // ComponentsModule,
    MarkdownModule.forChild(),
    OrangeStructuresModule,
    FlexLayoutModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule
  ]
})
export class BlogViewModule {}

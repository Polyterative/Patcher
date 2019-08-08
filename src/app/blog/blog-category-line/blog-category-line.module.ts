import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { BlogCategoryLineComponent } from './blog-category-line.component';


@NgModule({
  declarations: [BlogCategoryLineComponent],
  imports:      [
    CommonModule
  ],
  exports:      [BlogCategoryLineComponent]
})
export class BlogCategoryLineModule {}

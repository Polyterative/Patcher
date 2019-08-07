import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { PageRetrieverComponent } from './page-retriever.component';


@NgModule({
  declarations: [PageRetrieverComponent],
  imports:      [
    CommonModule
  ],
  exports:      [PageRetrieverComponent]
})
export class PageRetrieverModule {}

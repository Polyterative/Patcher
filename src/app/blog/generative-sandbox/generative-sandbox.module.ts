import { CommonModule }               from '@angular/common';
import { NgModule }                   from '@angular/core';
import { GenerativeSandboxComponent } from './generative-sandbox.component';


@NgModule({
  declarations: [GenerativeSandboxComponent],
  imports: [
    CommonModule
  ],
  exports: [GenerativeSandboxComponent]
})
export class GenerativeSandboxModule { }

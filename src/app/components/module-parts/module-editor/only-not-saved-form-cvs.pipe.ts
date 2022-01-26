import {
  Pipe,
  PipeTransform
}                 from '@angular/core';
import { FormCV } from './module-editor.component';

@Pipe({
  name: 'onlyNotSavedFormCVsLength'
})
export class OnlyNotSavedFormCVsLengthPipe implements PipeTransform {
  
  transform(formCVs: FormCV[]): number {
    return formCVs.filter(formCV => formCV.id === 0).length;
  }
  
}

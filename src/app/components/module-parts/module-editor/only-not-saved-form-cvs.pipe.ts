import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { FormCV } from './module-editor-data.service';


@Pipe({
  name: 'onlyNotSavedFormCVsLength',
  standalone: false
})
export class OnlyNotSavedFormCVsLengthPipe implements PipeTransform {
  
  transform(formCVs: FormCV[]): number {
    return formCVs.filter(formCV => formCV.id === 0).length;
  }
  
}

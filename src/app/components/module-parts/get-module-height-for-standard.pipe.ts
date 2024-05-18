import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { Standard } from '../../models/standard';


/**
 * Output in REM
 */
@Pipe({
  name: 'getModuleHeightForStandard'
})
export class GetModuleHeightForStandardPipe implements PipeTransform {
  
  transform(standard: Standard): number {
    let visuallyFound3UHeight: number = 25.4;
    let visuallyFound1UHeight: number = 7.6;
    return (standard.id == 0) || (standard.id == 1000) ? visuallyFound3UHeight : visuallyFound1UHeight;
  }
}
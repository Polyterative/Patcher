import { Pipe, PipeTransform } from '@angular/core';
import { Standard } from '../../models/standard';

/**
 * Output in REM
 */
@Pipe({
  name: 'getModuleHeightForStandard'
})
export class GetModuleHeightForStandardPipe implements PipeTransform {
  
  transform(standard: Standard): number {
    // let calculated3UHeight: number = 26.25;
    let visuallyFound3UHeight: number = 25.4;
    return (standard.id == 0) || (standard.id == 1000) ? visuallyFound3UHeight : 8.6;
    // return (standard.id == 0) || (standard.id == 1000) ? calculated1UHeight : 8.7;
  }
  
}

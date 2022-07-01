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
    return (standard.id == 0) || (standard.id == 1000) ? 26 : 6;
  }

}

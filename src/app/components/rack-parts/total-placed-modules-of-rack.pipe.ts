import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


/**
 * Counts only modules that are placed in a valid row/column (i.e., not unracked,
 * and not blank spacing modules). Used to drive the empty rack state so that
 * a module dropped into the unracked bucket from the bottom picker still keeps
 * the empty state visible until the user drags it into a real row.
 */
@Pipe({
  name: 'totalPlacedModulesOfRack',
  standalone: false
})
export class TotalPlacedModulesOfRackPipe implements PipeTransform {

  transform(value: RackedModule[][]): number {
    return value
      .reduce((accumulator, row) => accumulator.concat(row), [])
      .filter(m => !isBlankModule(m.module.id))
      .filter(m => m.rackingData.row !== null && m.rackingData.row !== undefined
        && m.rackingData.column !== null && m.rackingData.column !== undefined)
      .length;
  }

}

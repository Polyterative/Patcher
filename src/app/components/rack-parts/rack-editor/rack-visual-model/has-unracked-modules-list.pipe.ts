import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from 'src/app/models/module';


/** Returns true if any module across all rows is unplaced (row or column is null). */
@Pipe({
  name: 'hasUnrackedModulesList',
  standalone: false
})
export class HasUnrackedModulesListPipe implements PipeTransform {

  transform(rowedRackedModules: RackedModule[][] | null): boolean {
    if (!rowedRackedModules) return false;
    return rowedRackedModules.some(row =>
      row.some(m =>
        m.rackingData.row === null
        || m.rackingData.row === undefined
        || m.rackingData.column === null
        || m.rackingData.column === undefined
      )
    );
  }

}

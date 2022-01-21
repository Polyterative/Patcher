import {
  Pipe,
  PipeTransform
}                       from '@angular/core';
import { RackedModule } from '../../../../models/module';

@Pipe({
  name: 'hasUnrackedModules'
})
export class HasUnrackedModulesPipe implements PipeTransform {
  
  transform(rackedModules: RackedModule[]): boolean {
    console.log(rackedModules);
    return rackedModules.some(
      module => module.rackingData.row === null
                || module.rackingData.column === null
    );
  }
  
}

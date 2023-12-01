import { Pipe, PipeTransform } from '@angular/core';
import { RackedModule } from 'src/app/models/module';

@Pipe({
  name: 'hasUnrackedModules'
})
export class HasUnrackedModulesPipe implements PipeTransform {
  
  transform(rackedModules: RackedModule[]): boolean {
  
    return rackedModules.some(
      module => module.rackingData.row === null
                || module.rackingData.column === null
    );
  }
  
}

import {
  Pipe,
  PipeTransform
} from '@angular/core';
import {
  DbModule,
  RackedModule
} from '../../models/models';

@Pipe({
  name: 'rackedToModules'
})
export class RackedToModulesPipe implements PipeTransform {
  
  transform(value: RackedModule[], ...args: unknown[]): DbModule[] {
    return value.map(x => x.module);
  }
  
}

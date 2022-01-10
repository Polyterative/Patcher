import {
  Pipe,
  PipeTransform
}                   from '@angular/core';
import { DbModule } from '../../models/models';

@Pipe({
  name: 'totalHpOfModules'
})
export class TotalHpOfModulesPipe implements PipeTransform {
  
  transform(value: DbModule[]): number {
    // total hp for all modules
    return value.reduce((acc, cur) => acc + cur.hp, 0);
  }
  
}

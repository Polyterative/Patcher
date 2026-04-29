import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';


@Pipe({
  name: 'totalHpOfModules',
  standalone: false
})
export class TotalHpOfModulesPipe implements PipeTransform {
  
  transform(value: RackedModule[]): number {
    // total hp for all modules
    return value.reduce((acc, cur) => acc + cur.module.hp, 0);
  }
  
}

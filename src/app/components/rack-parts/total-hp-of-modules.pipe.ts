import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { getEffectiveRackedModuleHp } from './racked-module-hp.utils';


@Pipe({
  name: 'totalHpOfModules',
  standalone: false
})
export class TotalHpOfModulesPipe implements PipeTransform {
  
  transform(value: RackedModule[]): number {
    // total hp for all modules
    return value.reduce((acc, cur) => acc + getEffectiveRackedModuleHp(cur), 0);
  }
  
}

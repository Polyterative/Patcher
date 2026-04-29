import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


@Pipe({
  name: 'totalHpOfRack',
  standalone: false
})
export class TotalHpOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    // total hp for all non-blank modules
    return value.reduce((accumulator, value) => accumulator.concat(value), [])
                .filter(m => !isBlankModule(m.module.id))
                .reduce((acc, cur) => acc + cur.module.hp, 0);
  }
  
}

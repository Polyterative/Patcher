import { Pipe, PipeTransform } from '@angular/core';
import { RackedModule } from '../../models/module';

@Pipe({
  name: 'totalHpOfRack'
})
export class TotalHpOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    // total hp for all modules
    return value.reduce((accumulator, value) => accumulator.concat(value), [])
                .reduce((acc, cur) => acc + cur.module.hp, 0);
  }
  
}

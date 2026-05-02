import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


@Pipe({
  standalone: true,
  name: 'totalPowerOfRack'
})
export class TotalPowerOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number[] {
    return value.reduce((accumulator, value) => accumulator.concat(value), [])
      .filter(m => !isBlankModule(m.module.id))
      .reduce((accumulator, value) => {
        accumulator[0] += value.module.powerPos12 ?? 0;
        accumulator[1] += value.module.powerNeg12 ?? 0;
        accumulator[2] += value.module.powerPos5 ?? 0;
        return accumulator;
      }, [0, 0, 0]);
  }
  
}

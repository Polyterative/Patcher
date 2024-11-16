import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';


@Pipe({
  standalone: true,
  name: 'totalPowerOfRack'
})
export class TotalPowerOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number[] {
    return value.reduce((accumulator, value) => accumulator.concat(value), [])
      .reduce((accumulator, value) => {
        accumulator[0] += value.module.powerPos12;
        accumulator[1] += value.module.powerNeg12;
        accumulator[2] += value.module.powerPos5;
        return accumulator;
      }, [0, 0, 0]);
  }
  
}

import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';


@Pipe({
  standalone: true,
  name: 'totalMissingPowerDataInRack'
})
export class TotalMissingPowerDataInRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    
    //   return how many have null values as power in powerPos12, powerNeg12, powerPos5
    // only unique modules are counted
    
    return value.flat().filter((module, index, self) => {
        return self.findIndex((m) => m.module.id === module.module.id) === index;
      }
    ).reduce((accumulator, value) => {
      if (value.module.powerPos12 == null || value.module.powerNeg12 == null || value.module.powerPos5 == null) {
        accumulator++;
      }
      return accumulator;
    }, 0);
  }

}

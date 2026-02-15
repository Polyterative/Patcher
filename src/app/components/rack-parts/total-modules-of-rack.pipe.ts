import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';


@Pipe({
  name: 'totalModulesOfRack',
  standalone: false
})
export class TotalModulesOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    // total hp for all modules
    return value.reduce((accumulator, value) => accumulator.concat(value), [])
      .length;
  }
  
}
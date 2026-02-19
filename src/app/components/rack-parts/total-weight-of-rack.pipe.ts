import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


@Pipe({
  standalone: true,
  name: 'totalWeightOfRack'
})
export class TotalWeightOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    const weights = value
      .flat()
      .filter(module => !isBlankModule(module.module.id))
      .map(module => module.module.weight)
      .filter(weight => weight !== null);
    
    return weights.reduce((accumulator, weight) => accumulator + weight, 0);
  }
}
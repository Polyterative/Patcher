import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';


@Pipe({
  standalone: true,
  name: 'totalWeightOfRack'
})
export class TotalWeightOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    const weights = value
      .flat()
      .map(module => module.module.weight)
      .filter(weight => weight !== null);
    
    //
    // const maxWeight = Math.max(...weights);
    // const minWeight = Math.min(...weights);
    // const averageWeight = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
    //
    // return [maxWeight, minWeight, averageWeight];
    
    return weights.reduce((accumulator, weight) => accumulator + weight, 0);
  }
}

import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


@Pipe({
  standalone: true,
  name: 'totalDepthOfRack'
})
export class TotalDepthOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number[] {
    // Flatten the array, exclude blanks, and filter out undefined depths
    const depths = value
      .flat()
      .filter(module => !isBlankModule(module.module.id))
      .map(module => module.module.depth)
      .filter(depth => depth !== null);
    
    if (depths.length === 0) {
      // Return an array of zeros if there are no valid depths
      return [0, 0, 0];
    }
    
    const maxDepth = Math.max(...depths);
    const minDepth = Math.min(...depths);
    const averageDepth = depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
    
    return [maxDepth, minDepth, averageDepth];
  }
}
import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from '../../models/module';
import { isBlankModule } from './rack-blank-module.constants';


@Pipe({
  name: 'totalModulesOfRack',
  standalone: false
})
export class TotalModulesOfRackPipe implements PipeTransform {
  
  transform(value: RackedModule[][]): number {
    // total module count, excluding blank spacing modules
    return value
      .reduce((accumulator, value) => accumulator.concat(value), [])
      .filter(m => !isBlankModule(m.module.id))
      .length;
  }
  
}
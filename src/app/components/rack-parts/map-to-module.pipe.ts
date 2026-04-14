import {
  Pipe,
  PipeTransform
} from '@angular/core';
import {
  RackedModule
} from '../../models/module';
import { buildEffectiveRackedModule } from './racked-module-hp.utils';


@Pipe({
  name: 'mapToModule',
  standalone: false
})
export class MapToModulePipe implements PipeTransform {
  
  transform(value: RackedModule) {
    return buildEffectiveRackedModule(value);
  }
  
  
}

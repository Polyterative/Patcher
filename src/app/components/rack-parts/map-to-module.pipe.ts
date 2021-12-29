import {
  Pipe,
  PipeTransform
} from '@angular/core';
import {
  DbModule,
  RackedModule
} from '../../models/models';

@Pipe({
  name: 'mapToModule'
})
export class MapToModulePipe implements PipeTransform {
  
  transform(value: RackedModule): DbModule {
    // total hp for all modules
    return value.module;
  }
  
  
}

import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from "src/app/models/module";
import { getEffectiveRackedModuleHp } from '../racked-module-hp.utils';


@Pipe({
  name: 'calculateRowInformation',
  standalone: true
})
export class CalculateRowInformationPipe implements PipeTransform {
  
  transform(row: RackedModule[]): string {
    let totalHp = 0;
    row.forEach(module => {
      totalHp += getEffectiveRackedModuleHp(module);
    });
    return `Total HP: ${ totalHp }`;
  }
  
}

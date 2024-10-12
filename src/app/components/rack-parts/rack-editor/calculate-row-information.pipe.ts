import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { RackedModule } from "src/app/models/module";


@Pipe({
  name: 'calculateRowInformation',
  standalone: true
})
export class CalculateRowInformationPipe implements PipeTransform {
  
  transform(row: RackedModule[]): string {
    let totalHp = 0;
    row.forEach(module => {
      totalHp += module.module.hp;
    });
    return `Total HP: ${ totalHp }`;
  }
  
}
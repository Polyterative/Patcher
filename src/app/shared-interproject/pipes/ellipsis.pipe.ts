import {
  Pipe,
  PipeTransform
} from '@angular/core';


@Pipe({
  name: 'ellipsis',
  standalone: false
})
export class EllipsisPipe implements PipeTransform {
  transform(value: string, max: number): string {
    return value && value.length > max ? `${ value.slice(0, max) }...` : value;
  }
}
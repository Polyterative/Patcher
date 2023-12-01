import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ellipsis'
})
export class EllipsisPipe implements PipeTransform {
  transform(value: string, max: number): any {
    return value && value.length > max ? `${ value.slice(0, max) }...` : value;
  }
}

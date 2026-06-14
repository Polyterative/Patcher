import {
  Pipe,
  PipeTransform
} from '@angular/core';


@Pipe({
  name: 'ellipsis',
  standalone: true
})
export class EllipsisPipe implements PipeTransform {
  transform(value: string, max: number): string;
  transform(value: null, max: number): null;
  transform(value: undefined, max: number): undefined;
  transform(value: string | null | undefined, max: number): string | null | undefined {
    return value && value.length > max ? `${ value.slice(0, max) }...` : value;
  }
}
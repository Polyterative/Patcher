import {
  Pipe,
  PipeTransform
} from '@angular/core';
import {
  Tag,
  TagType
} from '../../../../models/tag';

@Pipe({
  name: 'onlyTagOfType'
})
export class OnlyTagOfTypePipe implements PipeTransform {
  
  transform(values: { tag: Tag }[], type: TagType): unknown {
    return values.map(x => x.tag)
                 .filter(value => value.type === type);
  }
  
}

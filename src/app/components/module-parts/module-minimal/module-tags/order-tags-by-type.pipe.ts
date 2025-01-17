import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { Tag } from 'src/app/models/tag';


@Pipe({
  name: 'orderTagsByType'
})
export class OrderTagsByTypePipe implements PipeTransform {
  
  transform(values: {
    tag: Tag
  }[]) {
    // order tags by type, type is an integer
    return values.sort((a, b) => {
      if (a.tag.type < b.tag.type) {
        return -1;
      }
      if (a.tag.type > b.tag.type) {
        return 1;
      }
      return 0;
    });
    
    return 0;
  }
  
}
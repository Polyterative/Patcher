import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { Tag, TAG_TYPE_DISPLAY_ORDER } from 'src/app/models/tag';


@Pipe({
  name: 'orderTagsByType',
  standalone: false
})
export class OrderTagsByTypePipe implements PipeTransform {
  
  transform(values: {
    tag: Tag
  }[]) {
    return values.sort((a, b) => {
      const ai = TAG_TYPE_DISPLAY_ORDER.indexOf(a.tag.type);
      const bi = TAG_TYPE_DISPLAY_ORDER.indexOf(b.tag.type);
      const aOrder = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bOrder = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      return aOrder - bOrder;
    });
  }
  
}
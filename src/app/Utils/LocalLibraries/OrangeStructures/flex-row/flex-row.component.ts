import {
  Component,
  Input
} from '@angular/core';

@Component({
  selector:    'lib-flex-row',
  templateUrl: './flex-row.component.html'
})
export class FlexRowComponent {
  
  @Input() gap = '1em';
  
}

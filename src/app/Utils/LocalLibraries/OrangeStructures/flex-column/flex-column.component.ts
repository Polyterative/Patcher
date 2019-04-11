import {
  Component,
  Input
} from '@angular/core';

@Component({
  selector:    'lib-flex-column',
  templateUrl: './flex-column.component.html'
})
export class FlexColumnComponent {
  
  @Input() gap = '1em';
  
}

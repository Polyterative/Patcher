import {
  ChangeDetectionStrategy,
  Component
}                   from '@angular/core';
import { FlexBase } from '../flex-base';

@Component({
  selector:        'lib-flex-column',
  templateUrl:     './flex-column.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlexColumnComponent extends FlexBase {
  
}

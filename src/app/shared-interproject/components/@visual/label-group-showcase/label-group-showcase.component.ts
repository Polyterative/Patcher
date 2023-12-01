import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-label-group-showcase',
  templateUrl:     './label-group-showcase.component.html',
  styleUrls:       ['./label-group-showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabelGroupShowcaseComponent {
  @Input()
  label: string;

  @Input()
  bigText = true;

  @Input()
  pushToEnd = false;

  @Input()
  valueBelow = true;
}

import {
    ChangeDetectionStrategy,
    Component,
    Input
} from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-label-value-showcase',
  templateUrl:     './label-value-showcase.component.html',
  styleUrls:       ['./label-value-showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabelValueShowcaseComponent {
  @Input()
  label: string;

  @Input()
  bigText = true;

  @Input()
  pushToEnd = false;

  @Input()
  valueBelow = true;

  @Input()
  monospace = false;
}

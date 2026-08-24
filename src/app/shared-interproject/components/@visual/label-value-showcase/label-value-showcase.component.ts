import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';


/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'app-label-value-showcase',
  templateUrl: './label-value-showcase.component.html',
  styleUrls: ['./label-value-showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class LabelValueShowcaseComponent {
  @Input()
  label: string;

  @Input()
  labelSuffix?: string;

  @Input()
  icon?: string;

  @Input()
  bigText = true;

  @Input()
  pushToEnd = false;

  @Input()
  valueBelow = true;

  @Input()
  monospace = false;
}
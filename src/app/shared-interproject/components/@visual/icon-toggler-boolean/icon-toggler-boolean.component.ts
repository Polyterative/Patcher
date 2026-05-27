import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector:        'app-icon-toggler-boolean',
  templateUrl:     './icon-toggler-boolean.component.html',
  styleUrls:       ['./icon-toggler-boolean.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, AsyncPipe, FlexLayoutModule, MatIconModule, MatSlideToggleModule, MatTooltipModule]
})
export class IconTogglerBooleanComponent {
  @Input() icon?: string;
  @Input() iconOff?: string; //optional
  @Input() description: string;
  @Input() data: BehaviorSubject<boolean>;
  @Input() disabled: boolean = false;
}

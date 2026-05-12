import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';

type AdviceTooltipTone = 'info' | 'warning' | 'danger' | 'success';

@Component({
  selector: 'app-advice-tooltip',
  templateUrl: './advice-tooltip.component.html',
  styleUrls: ['./advice-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdviceTooltipComponent {
  @Input() title = '';
  @Input() tone: AdviceTooltipTone = 'warning';
  @Input() icon?: string;

  get iconName(): string {
    if (this.icon) {
      return this.icon;
    }

    switch (this.tone) {
      case 'info':
        return 'info';
      case 'danger':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'warning':
      default:
        return 'lightbulb';
    }
  }
}

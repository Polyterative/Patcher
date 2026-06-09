import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';

export interface EmptyStateTip {
  icon: string;
  /** HTML allowed for <strong> highlighting */
  html: string;
}

@Component({
  selector: 'app-empty-state-tips',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './empty-state-tips.component.html',
  styleUrls: ['./empty-state-tips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1525ms {{ delay }}ms ease', style({ opacity: 1 })),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ])
  ]
})
export class EmptyStateTipsComponent {
  @Input() icon = 'info';
  @Input() title = '';
  @Input() copy = '';
  @Input() tips: EmptyStateTip[] = [];
  /** Compact mode: slim banner-style for transitional/progress states */
  @Input() compact = false;
}


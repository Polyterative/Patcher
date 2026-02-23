import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';


@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  animations: [
    fadeInOnEnterAnimation({anchor: 'enter', duration: 200}),
    fadeOutOnLeaveAnimation({anchor: 'exit', duration: 150})
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class StatisticsComponent implements OnInit {
  
  @Input() title: string | null = null;
  @Input() cardClass: string = '';

  @Input() statistics: {
    name: string;
    value: number;
    icon?: string;
  }[] | null;
  
  get visibleStatistics() {
    return this.statistics?.filter(s => s.value > 0) ?? [];
  }
  
  constructor() {
  }
  
  ngOnInit(): void {
  }
  
}

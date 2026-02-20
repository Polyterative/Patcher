import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';


@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class StatisticsComponent implements OnInit {
  
  @Input() title: string | null = null;

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
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsComponent implements OnInit {
  
  @Input() statistics: {
    name: string;
    value: number;
  }[] | null;
  
  constructor() {
  }
  
  ngOnInit(): void {
  }
  
}
import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';


@Component({
  selector: 'app-advice-tooltip',
  templateUrl: './advice-tooltip.component.html',
  styleUrls: ['./advice-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdviceTooltipComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
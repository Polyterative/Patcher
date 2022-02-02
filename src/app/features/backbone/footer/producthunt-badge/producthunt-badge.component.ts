import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-producthunt-badge',
  templateUrl:     './producthunt-badge.component.html',
  styleUrls:       ['./producthunt-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProducthuntBadgeComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

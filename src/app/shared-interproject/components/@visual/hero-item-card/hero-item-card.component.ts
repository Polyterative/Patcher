import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'lib-hero-item-card',
  templateUrl:     './hero-item-card.component.html',
  styleUrls:       ['./hero-item-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroItemCardComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

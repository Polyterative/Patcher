import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector:        'lib-hero-item-card',
  templateUrl:     './hero-item-card.component.html',
  styleUrls:       ['./hero-item-card.component.scss'],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroItemCardComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

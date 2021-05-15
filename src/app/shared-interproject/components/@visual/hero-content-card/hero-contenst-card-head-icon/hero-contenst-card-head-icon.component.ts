import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector:        'app-hero-content-card-head-icon',
  templateUrl:     './hero-contenst-card-head-icon.component.html',
  styleUrls:       ['./hero-contenst-card-head-icon.component.scss'],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroContenstCardHeadIconComponent implements OnInit {
  @Input()
  icon: string;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';


@Component({
  selector:        'app-hero-content-card-head-icon',
  templateUrl: './hero-content-card-head-icon.component.html',
  styleUrls: ['./hero-content-card-head-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroContentCardHeadIconComponent implements OnInit {
  @Input()
  icon: string;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
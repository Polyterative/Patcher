import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

@Component({
  selector:        'lib-hero-header',
  templateUrl:     './hero-header.component.html',
  styleUrls:       ['./hero-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroHeaderComponent implements OnInit {
  @Input() public readonly title = '';
  @Input() public readonly description = '';
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

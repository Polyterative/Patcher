import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector:        'lib-clean-card',
  templateUrl:     './clean-card.component.html',
  styleUrls:       ['./clean-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  
})
export class CleanCardComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

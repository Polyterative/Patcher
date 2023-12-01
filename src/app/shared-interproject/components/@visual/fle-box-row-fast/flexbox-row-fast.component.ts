import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector:        'flexbox-row-fast',
  templateUrl:     './flexbox-row-fast.component.html',
  styleUrls:       ['./flexbox-row-fast.component.scss'],
  encapsulation:   ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlexboxRowFastComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

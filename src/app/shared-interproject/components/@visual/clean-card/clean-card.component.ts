import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector:        'lib-clean-card',
  templateUrl:     './clean-card.component.html',
  styleUrls:       ['./clean-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class CleanCardComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

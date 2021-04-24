import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
} from '@angular/core';

@Component({
  selector:        'lib-width-limiter',
  templateUrl:     './width-limiter.component.html',
  styleUrls:       ['./width-limiter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class WidthLimiterComponent implements OnInit {
  @Input()
  public readonly max: string = '16rem';
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
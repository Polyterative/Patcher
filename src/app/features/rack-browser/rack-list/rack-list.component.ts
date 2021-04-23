import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RackMinimal }     from 'src/app/models/models';

@Component({
  selector:        'app-rack-list',
  templateUrl:     './rack-list.component.html',
  styleUrls:       ['./rack-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class RackListComponent implements OnInit {
  @Input()
  readonly data$ = new BehaviorSubject<RackMinimal[]>([]);
  
  ngOnInit(): void {
  }
  
}

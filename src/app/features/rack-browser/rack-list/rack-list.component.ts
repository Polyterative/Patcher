import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  ViewEncapsulation
}                     from '@angular/core';
import { Observable } from 'rxjs';
import { RackList }   from '../rack-browser-data.service';

@Component({
  selector:        'app-rack-list',
  templateUrl:     './rack-list.component.html',
  styleUrls:       ['./rack-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None
})
export class RackListComponent implements OnInit {
  @Input()
  readonly data$: Observable<RackList>;
  
  ngOnInit(): void {
  }
  
}

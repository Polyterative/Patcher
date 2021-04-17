import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MinimalModule }   from '../../../models/models';

@Component({
  selector:        'app-module-list',
  templateUrl:     './module-list.component.html',
  styleUrls:       ['./module-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleListComponent implements OnInit {
  @Input()
  readonly data$ = new BehaviorSubject<MinimalModule[]>([]);
  
  ngOnInit(): void {
  }
  
}

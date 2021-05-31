import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                       from '@angular/core';
import { Observable }   from 'rxjs';
import { PatchMinimal } from '../../../models/models';

@Component({
  selector:        'app-module-patches',
  templateUrl:     './module-patches.component.html',
  styleUrls:       ['./module-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePatchesComponent implements OnInit {
  @Input()
  readonly data$: Observable<PatchMinimal>;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

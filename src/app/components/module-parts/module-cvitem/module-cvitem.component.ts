import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                  from '@angular/core';
import { Subject } from 'rxjs';
import { CV }      from '../../../models/models';

@Component({
  selector:        'app-module-cvitem',
  templateUrl:     './module-cvitem.component.html',
  styleUrls:       ['./module-cvitem.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCVItemComponent implements OnInit {
  @Input()
  public readonly data: CV;
  @Output() click$ = new Subject<CV>();
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

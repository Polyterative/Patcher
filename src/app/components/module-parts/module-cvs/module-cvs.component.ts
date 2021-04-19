import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                  from '@angular/core';
import { Subject } from 'rxjs';
import {
  CV,
  DbModule
}                  from '../../../models/models';

@Component({
  selector:        'app-module-cvs',
  templateUrl:     './module-cvs.component.html',
  styleUrls:       ['./module-cvs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCVsComponent implements OnInit {
  @Input() data: DbModule;
  
  ins: CV[] = [];
  outs: CV[] = [];
  
  @Output() inClick$ = new Subject<[CV, DbModule]>();
  @Output() outClick$ = new Subject<[CV, DbModule]>();
  
  constructor() { }
  
  ngOnInit(): void {
  
    if (this.data.ins) { this.ins = this.data.ins; }
    if (this.data.outs) { this.outs = this.data.outs;}
  
  }
  
}

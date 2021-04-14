import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  CV,
  DbModule
} from '../../../models/models';

@Component({
  selector:        'app-module-details',
  templateUrl:     './module-details.component.html',
  styleUrls:       ['./module-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleDetailsComponent implements OnInit {
  @Input() data: DbModule;
  
  ins: CV[] = [];
  outs: CV[] = [];
  switches = [];
  
  constructor() { }
  
  ngOnInit(): void {
  
    if (this.data.ins && JSON.parse(this.data.ins)) { this.ins = JSON.parse(this.data.ins);}
    if (this.data.outs && JSON.parse(this.data.outs)) { this.outs = JSON.parse(this.data.outs);}
  
  }
  
}

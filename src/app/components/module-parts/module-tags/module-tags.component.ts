import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                   from '@angular/core';
import { DbModule } from '../../../models/models';

@Component({
  selector:        'app-module-tags',
  templateUrl:     './module-tags.component.html',
  styleUrls:       ['./module-tags.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleTagsComponent implements OnInit {
  
  @Input() data: DbModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

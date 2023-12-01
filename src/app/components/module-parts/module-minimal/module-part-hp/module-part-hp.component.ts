import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { MinimalModule } from 'src/app/models/module';

@Component({
  selector:        'app-module-part-hp',
  templateUrl:     './module-part-hp.component.html',
  styleUrls:       ['./module-part-hp.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartHpComponent implements OnInit {
  
  @Input() data: MinimalModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

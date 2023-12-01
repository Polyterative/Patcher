import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { MinimalModule } from 'src/app/models/module';

@Component({
  selector:        'app-module-part-manufacturer',
  templateUrl:     './module-part-manufacturer.component.html',
  styleUrls:       ['./module-part-manufacturer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePartManufacturerComponent implements OnInit {
  
  @Input() data: MinimalModule;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                   from '@angular/core';
import { MinimalModule }            from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
  selector:        'app-module-browser-module-minimal',
  templateUrl:     './module-browser-module-minimal.component.html',
  styleUrls:       ['./module-browser-module-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleMinimalComponent implements OnInit {
  @Input() data: MinimalModule;
  
  constructor(public dataService: ModuleBrowserDataService) {}
  
  ngOnInit(): void {
  }
  
}

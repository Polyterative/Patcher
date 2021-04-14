import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                   from '@angular/core';
import { DbModule }                 from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-module',
    templateUrl:     './module-browser-module.component.html',
    styleUrls:       ['./module-browser-module.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleComponent implements OnInit {
  @Input() data: DbModule;
    
    constructor(public dataService: ModuleBrowserDataService) {}
    
    ngOnInit(): void {
    }
    
}

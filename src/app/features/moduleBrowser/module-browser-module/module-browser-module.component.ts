import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                                   from '@angular/core';
import { DBEuroModule }             from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-module',
    templateUrl:     './module-browser-module.component.html',
    styleUrls:       ['./module-browser-module.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleComponent implements OnInit {
    @Input() data: DBEuroModule;
    
    constructor(public dataService: ModuleBrowserDataService) {}
    
    ngOnInit(): void {
    }
    
}
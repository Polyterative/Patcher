import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnInit
}                                   from '@angular/core';
import { MinimalEuroModule }        from '../../../models/models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-module-minimal',
    templateUrl:     './module-browser-module-minimal.component.html',
    styleUrls:       ['./module-browser-module-minimal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleMinimalComponent implements OnInit {
    @Input() data: MinimalEuroModule;
    
    constructor(public dataService: ModuleBrowserDataService) {}
    
    ngOnInit(): void {
    }
    
}
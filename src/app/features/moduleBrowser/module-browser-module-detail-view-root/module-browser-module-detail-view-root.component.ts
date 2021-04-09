import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}                  from '@angular/core';
import { modules } from '../../../models/models';

@Component({
    selector:        'app-module-browser-module-detail-view-root',
    templateUrl:     './module-browser-module-detail-view-root.component.html',
    styleUrls:       ['./module-browser-module-detail-view-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {
    
    modules = modules;
    
    constructor() {
        
        // debugger;
    }
    
    ngOnInit(): void {
    }
    
}
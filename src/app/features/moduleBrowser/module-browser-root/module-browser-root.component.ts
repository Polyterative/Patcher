import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}                  from '@angular/core';
import { modules } from '../../patchBuilder/models/models';

@Component({
    selector:        'app-module-browser-root',
    templateUrl:     './module-browser-root.component.html',
    styleUrls:       ['./module-browser-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserRootComponent implements OnInit {
    items = modules;
    
    constructor() { }
    
    ngOnInit(): void {
    }
    
}
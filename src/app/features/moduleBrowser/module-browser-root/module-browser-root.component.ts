import {
    ChangeDetectionStrategy,
    Component,
    OnInit
}                                   from '@angular/core';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
    selector:        'app-module-browser-root',
    templateUrl:     './module-browser-root.component.html',
    styleUrls:       ['./module-browser-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserRootComponent implements OnInit {
    
    constructor(public dataService: ModuleBrowserDataService) { }
    
    ngOnInit(): void {
    }
    
}